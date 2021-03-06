package net.hungryboys.letsyeat.navigation;

import android.util.Log;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import net.hungryboys.letsyeat.api.APICaller;
import net.hungryboys.letsyeat.data.RecipeID;
import net.hungryboys.letsyeat.login.LoginRepository;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class NavigationViewModel extends ViewModel {

    public static final String TAG_NAV = "NavigationViewModel";

    private MutableLiveData<RecipeID> recipeId = new MutableLiveData<>();;

    public LiveData<RecipeID> getRecipeId() {
        return recipeId;
    }

    public void yeetClicked(){
       loadSuggestion();
    }

    private void loadSuggestion() {
        LoginRepository login = LoginRepository.getInstance();

        if (login.isLoggedIn()) {
            Call<RecipeID> call = APICaller.getApiCall().getRecipeSuggestion(login.getUserEmail());
            call.enqueue(new Callback<RecipeID>() {
                @Override
                public void onResponse(Call<RecipeID> call, Response<RecipeID> response) {
                    if (response.isSuccessful()) {
                        recipeId.postValue(response.body());
                    } else {
                        Log.e(TAG_NAV, "Could not get recipe suggestion" + response.errorBody());
                    }
                }

                @Override
                public void onFailure(Call<RecipeID> call, Throwable t) {
                    Log.e(TAG_NAV, "Could not get recipe suggestion", t);
                }
            });
        }


    }
}
