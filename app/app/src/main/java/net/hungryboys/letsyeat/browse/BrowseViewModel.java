package net.hungryboys.letsyeat.browse;

import android.util.Log;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import net.hungryboys.letsyeat.data.model.Recipe;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class BrowseViewModel extends ViewModel {
    private final static String TAG = "BROWSE_VM";

    private MutableLiveData<List<Recipe>> recipes;

    private Set<String> selectedTags = new HashSet<>();
    private String searchText = "";

    public LiveData<List<Recipe>> getRecipes() {
        if (recipes == null) {
            recipes = new MutableLiveData<>();
            loadRecipes();
        }

        return recipes;
    }

    public boolean hasTagsSelected() {
        return selectedTags.size() > 0;
    }

    public void searchTextChanged(String search) {
        String old = searchText;
        searchText = search;

        if (!searchText.equals(old)) {
            search();
        }
    }

    public void tagChanged(String tag, boolean selected) {
        Set<String> previous = new HashSet<>(selectedTags);

        if (selected) {
            selectedTags.add(tag);
        } else {
            selectedTags.remove(tag);
        }

        if (!selectedTags.equals(previous)) {
            search();
        }
    }

    private void search() {
        StringBuilder sb = new StringBuilder();
        for (String tag : selectedTags) {
            sb.append(tag);
            sb.append(" ");
        }

        Log.d(TAG, "Searching for: " + searchText + " with tags: " + sb.toString());
    }



    // TODO replace hardcoded values with calls to server/recipe cache
    private void loadRecipes() {
        List<Recipe> recipeList = new ArrayList<>();
        for (int i = 0; i < 30; i++){
            recipeList.add(Recipe.placeholder());
        }

        recipes.setValue(recipeList);
    }
}