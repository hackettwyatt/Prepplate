const express = require('express');
const axios = require('axios');

const router = express.Router();

const NUTRITIONX_API_KEY = 'a498acfe82eb362fa70195893e03ff66';  
const NUTRITIONX_APP_ID = '7f3ca66e';

const nutritionxCache = new Map(); 

const fetchMealData = async (ingredient) => {
    try {
        const response = await axios.get(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`);
        return response.data.meals || [];
    } catch (error) {
        console.error(`Error fetching meal data for ${ingredient}:`, error);
        return [];
    }
};

const fetchMealDetails = async (mealId) => {
    try {
        const response = await axios.get(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
        return response.data.meals ? response.data.meals[0] : null;
    } catch (error) {
        console.error(`Error fetching details for meal ID ${mealId}:`, error);
        return null;
    }
};

const getUniqueIngredients = (meal) => {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        if (ingredient && ingredient.trim() !== '') {
            ingredients.push(ingredient.trim());
        }
    }
    return ingredients;
};

const checkIngredientsInNutritionix = async (ingredients) => {
    const checkPromises = ingredients.map(async (ingredient) => {
        if (nutritionxCache.has(ingredient)) {
            return nutritionxCache.get(ingredient) ? ingredient : null;
        }

        try {
            const response = await axios.get(
                `https://trackapi.nutritionix.com/v2/natural/nutrients`,
                {
                    headers: {
                        'x-app-id': NUTRITIONX_API_ID,
                        'x-app-key': NUTRITIONX_API_KEY
                    }
                }
            );
            const isValid = response.data.common.length > 0;
            nutritionxCache.set(ingredient, isValid);
            return isValid ? ingredient : null;
        } catch (error) {
            console.error(`Error checking ingredient ${ingredient} in Nutritionix:`, error);
            nutritionxCache.set(ingredient, false);
            return null;
        }
    });

    const results = await Promise.all(checkPromises);
    return results.filter(Boolean);
};

const filterMealsByNutritionix = async (meals) => {
    const validMeals = [];
    for (const meal of meals) {
        const ingredients = getUniqueIngredients(meal);
        const validIngredients = await checkIngredientsInNutritionix(ingredients);
        if (validIngredients.length === ingredients.length) {
            validMeals.push(meal);
        }
    }
    return validMeals;
};

const getCommonMeals = (mealsArrays, ingredientCount) => {
    const mealMap = new Map();
    mealsArrays.flat().forEach(meal => {
        const id = meal.idMeal;
        if (!mealMap.has(id)) {
            mealMap.set(id, { meal, count: 1 });
        } else {
            mealMap.get(id).count += 1;
        }
    });

    return Array.from(mealMap.values())
        .filter(entry => entry.count === ingredientCount)
        .map(entry => entry.meal);
};

const slimMeal = (meal) => ({
    id: meal.idMeal,
    name: meal.strMeal,
    thumbnail: meal.strMealThumb,
    category: meal.strCategory,
    area: meal.strArea,
});

const searchMeals = async (ingredients) => {
    const allMealsResults = await Promise.all(
        ingredients.map(ingredient => fetchMealData(ingredient))
    );

    const filteredMeals = getCommonMeals(allMealsResults, ingredients.length);

    const detailedMeals = await Promise.all(
        filteredMeals.map(meal => fetchMealDetails(meal.idMeal))
    );

    const nonNullMeals = detailedMeals.filter(meal => meal !== null);
    const nutritionixValidMeals = await filterMealsByNutritionix(nonNullMeals);

    return nutritionixValidMeals;
};

router.get('/searchMeals', async (req, res) => {
    const { ingredients } = req.query;

    if (!ingredients) {
        return res.status(400).send('Please provide ingredients.');
    }

    const ingredientsArray = ingredients
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

    if (ingredientsArray.length === 0 || ingredientsArray.length > 6) {
        return res.status(400).send('You can search for up to 6 ingredients.');
    }

    try {
        const meals = await searchMeals(ingredientsArray);
        res.json(meals.map(slimMeal)); 
    } catch (error) {
        console.error('Error during meal search:', error);
        res.status(500).send('Error fetching meals.');
    }
});

router.get('/getMealByName/:name', async (req, res) => {
    const mealName = req.params.name.trim();
    try {
        const encodedMealName = encodeURIComponent(mealName);
        const response = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodedMealName}`);
        if (response.data.meals && response.data.meals.length > 0) {
            res.json(response.data);
        } else {
            res.status(404).json({ message: `No meal found with the name '${mealName}'` });
        }
    } catch (error) {
        console.error("Error fetching meal data:", error);
        res.status(500).json({ message: 'Error fetching meal data from external API' });
    }
});

module.exports = router;
