'use strict';
const path = require('path')
const rp = require('request-promise');
const $ = require('cheerio');
const Recipe = require('./recipe.js').Recipe;
const Ingredient = require('./recipe.js').Ingredient

// TIL path is relative to where the Node process is started
// we want relative path to this file, so use path.join()..
const possible_tags = new Set(JSON.parse(require('fs').readFileSync(path.join(__dirname,"./tags.json"))).tags);

const BUDGETBYTES_ARCHIVE = "https://www.budgetbytes.com/archive";
const BB_OLDEST_YEAR = 2009;
const BB_OLDEST_MONTH = 5;

/**
 * Parses up to `max` recipes on budgetbytes from the month of `fromDate`
 * to the month of `toDate` (inclusive)
 * @param {int} max : maximum number of recipes returned
 * @param {Date} fromDate : start of parsing range
 * @param {Date} toDate : end of parsing range, if in the future, will stop at current month
 */
exports.parseByDate = function (max, fromYear, fromMonth, toYear, toMonth) {
    // Validate arguments

    if (inFuture(fromYear, fromMonth)) {
        return Promise.reject(new Error("Cannot start date range in future: " + fromYear + "-" + fromMonth));
    } 

    if (inFuture(BB_OLDEST_YEAR, BB_OLDEST_MONTH, fromYear, fromMonth)) {  // If before oldest recipe in BB
        return Promise.reject(new Error("Date range starts too early: " + fromYear + "-" + fromMonth));
    }

    const now = new Date();
    let year = inFuture(toYear, toMonth) ? now.getFullYear() : toYear;
    let month = inFuture(toYear, toMonth) ? now.getMonth() : toMonth;
    
    // Go trough budgetbytes archive in reverse order, add each page's recipes to list 
    
    let recipesPromises = [];
    while (year > fromYear || year == fromYear && month >= fromMonth) {
        let localMonth = month;     // Declare local variables in block scope to avoid problems with closure in promise
        let localYear = year;       
        recipesPromises.push(findRecipesInArchive(localYear, localMonth))

        month--;
        if (month == 0) {
            year--;
            month = 12;
        }
    }

    // We now have Array[Promise[Array[URL]]], which we transform into Promise[Array[Array[URL]]] then flatten array
    // Then parse each URL => Promise[Array[Promise[Recipe]]], which we flatten again and return Promise[Array[Recipe]]
    return Promise.all(recipesPromises).then(urls => {
        const flatURLs = [].concat(...urls).slice(0, max); // Keep only max recipes
        const promises = flatURLs.map(exports.parseUrl);

        return Promise.all(promises);
    });
}

function inFuture(year, month, toYear, toMonth) {
    let now = new Date();
    if (toYear && toMonth) {
        now.setFullYear(toYear);
        now.setMonth(toMonth);
    }

    return 12*year + month > 12*now.getFullYear() + now.getMonth() 
}

function findRecipesInArchive(year, month) {
    return rp(BUDGETBYTES_ARCHIVE + "/" + year + "/" + month).then(monthHtml => {
        const recipeList = [];

        $(".archive-post > a", monthHtml).each((i, e) => {
            recipeList.push($(e).attr("href"));
        });

        return Promise.resolve(recipeList)
    }).catch(() => Promise.resolve([]));        // In case of error while parsing list, return empty list
}


// ================================ Single Recipe Parsing ================================= //

/**
 * Returns a promise to a single Recipe from given url
 * @param bb_url : URL to specific budgetbytes recipe
 */
exports.parseUrl = function (bb_url) {
    return rp(bb_url).then(html => {
        const pictureUrl = parseImgSrc(html);
        const tags = parseTags(html);

        const recipe = $(".wprm-recipe-container > .wprm-recipe", html);

        const name = $(".wprm-recipe-name", recipe).text();
        const time = parseTime(recipe);
        const difficulty = 3;
        const ingredients = parseIngredients(recipe);
        const instructions = parseInstructions(recipe);
        
        return new Recipe(bb_url, name, pictureUrl, time, difficulty, 
            ingredients, instructions, tags);
    });
}

function parseImgSrc(html) {
    try {
        const noscriptTag = $(".post > p > noscript", html)
        const intermediate = noscriptTag.get(0).children[0].data;
        const parser = $.load(intermediate, {xmlMode: true});
    
        return parser("img").attr("src");
    } catch (err) {
        return null;
    }

}

function parseTags(html) {
    function extractBreadcrumbs(html) {
        return $("#breadcrumbs", html).text();
    }

    const words = extractBreadcrumbs(html).split(" ")   // split into words
        .map(s => s.replace(/\W/g, "").toLowerCase())   // remove special chars
        .filter(s => s.length > 0)                      // remove empty words
    
    // Intersection of words and potential tags
    const tags = [...new Set(words)].filter(w => possible_tags.has(w));
    
    return tags;
}

function parseTime(recipe) {
    const hoursStr = $(".wprm-recipe-total_time-hours", recipe).text();
    const minutesStr = $(".wprm-recipe-total_time-minutes", recipe).text();
    
    const convert = (value) => value === "" ? 0 : parseInt(value)

    return 60*convert(hoursStr) + convert(minutesStr);
}

function parseIngredients(recipe) {
    const ingredients = [];

    $("li.wprm-recipe-ingredient", recipe).each((_, e) => {
        const amount = $(e).find(".wprm-recipe-ingredient-amount").text();
        const name = $(e).find(".wprm-recipe-ingredient-name").text();

        const unitSel = $(e).find(".wprm-recipe-ingredient-unit");
        const unit = unitSel.length == 0 ? null : unitSel.text();

        ingredients.push(new Ingredient(name, amount, unit));
    });

    return ingredients;
}

function parseInstructions(recipe) {
    const instructions = []

    $("li.wprm-recipe-instruction", recipe).each((i, elem) => {
        instructions.push($(elem).text());
    });

    return instructions;
}