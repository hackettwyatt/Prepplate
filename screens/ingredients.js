import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Delay function for spacing API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const Ingredients = () => {
  const [meals, setMeals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightIngredients, setHighlightIngredients] = useState([]);
  const mealsPerPage = 20;
  const navigation = useNavigation();
  const db = getFirestore();
  const auth = getAuth();

  const BACKEND_URL = 'http://10.0.2.2:5000/api';

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const mealRequests = [];
  
      for (let i = 0; i < 100; i++) {
        mealRequests.push(axios.get('https://www.themealdb.com/api/json/v1/1/random.php'));
      }
  
      const responses = await Promise.all(mealRequests);
  
      const mealsData = responses
        .map(response => response.data.meals[0])
        .filter(meal => meal !== undefined);
  
      const uniqueMeals = Array.from(new Map(mealsData.map(meal => [meal.idMeal, meal])).values());
  
      setMeals(uniqueMeals);
      setHighlightIngredients([]);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMeals();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      fetchMeals(); 
      setHighlightIngredients([]); 
    } else {
      searchMeals();
    }
  }, [searchQuery]);
  
  const searchMeals = () => {
    const ingredientsArray = searchQuery
      .split(',')
      .map(i => i.trim().toLowerCase())
      .filter(i => i.length > 0);
  
    if (ingredientsArray.length === 0 || ingredientsArray.length > 6) {
      console.warn('Please provide between 1 and 6 ingredients.');
      return;
    }
  
    setHighlightIngredients(ingredientsArray);
  
    const scoredMeals = meals
      .map(meal => {
        const mealIngredientNames = [];
        for (let i = 1; i <= 20; i++) {
          const ing = meal[`strIngredient${i}`];
          if (ing && ing.trim()) {
            mealIngredientNames.push(ing.trim().toLowerCase());
          }
        }
  
        const matchCount = ingredientsArray.reduce((count, searchIng) => {
          return count + mealIngredientNames.filter(mealIng => mealIng.includes(searchIng)).length;
        }, 0);
  
        return { ...meal, matchCount };
      })
      .filter(meal => meal.matchCount > 0) 
      .sort((a, b) => b.matchCount - a.matchCount); 
  
    setMeals(scoredMeals);
    setCurrentPage(1);
  };
  
  const getUniqueIngredients = (meal) => {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ing && ing.trim()) {
        const fullIng = `${measure?.trim() || ""} ${ing.trim()}`.trim();
        ingredients.push(fullIng.toLowerCase());
      }
    }
    return ingredients;
  };
  

  const saveMealToUserAccount = async (meal) => {
    const user = auth.currentUser;
    if (!user) {
      console.log("User not authenticated");
      return;
    }
    try {
      const userMealsRef = collection(db, `userMeals/${user.uid}/meals`);
      await addDoc(userMealsRef, meal);
      console.log("Meal saved to Firestore");
    } catch (e) {
      console.error("Error saving meal:", e);
    }
  };

  const navigateToMeals = () => {
    navigation.navigate('Meals');
  };

  const idxLast = currentPage * mealsPerPage;
  const idxFirst = idxLast - mealsPerPage;
  const currentMeals = meals.slice(idxFirst, idxLast);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Ingredient Search</Text>

      <TextInput
        style={styles.searchBar}
        placeholder="Search ingredients (max 6)"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <ScrollView style={styles.scrollView}>
          {currentMeals.length > 0 ? (
            currentMeals.map(meal => (
              <View key={meal.idMeal} style={styles.mealCard}>
                <Image source={{ uri: meal.strMealThumb }} style={styles.mealImage} />
                <Text style={styles.mealName}>{meal.strMeal}</Text>
                <Text style={styles.ingredientsHeader}>Ingredients:</Text>
                <View style={styles.ingredientsList}>
                  {getUniqueIngredients(meal).map((ing, i) => {
                    const isHighlighted = highlightIngredients.some(h =>
                      ing.toLowerCase().includes(h)
                    );
                    
                    return (
                      <Text
                        key={i}
                        style={[styles.ingredientItem, isHighlighted && styles.highlightedIngredient]}
                      >
                        {ing}
                      </Text>
                    );
                  })}
                </View>
                <TouchableOpacity onPress={() => saveMealToUserAccount(meal)} style={styles.addButton}>
                  <Text style={styles.addButtonText}>Save to My Meals</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.noMealsText}>No meals found</Text>
          )}
        </ScrollView>
      )}

      <View style={styles.pagination}>
        {currentPage > 1 && (
          <TouchableOpacity onPress={() => setCurrentPage(currentPage - 1)} style={styles.pageButton}>
            <Text style={styles.pageButtonText}>← Previous</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.pageNumber}>Page {currentPage}</Text>
        {idxLast < meals.length && (
          <TouchableOpacity onPress={() => setCurrentPage(currentPage + 1)} style={styles.pageButton}>
            <Text style={styles.pageButtonText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity onPress={navigateToMeals} style={styles.viewMealsButton}>
          <Text style={styles.viewMealsButtonText}>View My Meals</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.goHomeButton}>
          <Text style={styles.goHomeButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1E3", alignItems: "center", padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  searchBar: { height: 40, width: "100%", backgroundColor: "#fff", borderColor: "#ddd", borderWidth: 1, borderRadius: 5, paddingLeft: 10, marginBottom: 10 },
  loadingText: { fontSize: 16, color: "#555" },
  scrollView: { width: "100%" },
  mealCard: { backgroundColor: "#f9f9f9", marginBottom: 20, padding: 15, borderRadius: 10, width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  mealImage: { width: "100%", height: 200, borderRadius: 10, marginBottom: 10 },
  mealName: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  ingredientsHeader: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  ingredientsList: { marginBottom: 10 },
  ingredientItem: { fontSize: 14, color: "#555" },
  highlightedIngredient: { color: "#D84315", fontWeight: "bold" },
  addButton: { backgroundColor: "#4CAF50", padding: 10, borderRadius: 5, alignItems: "center", marginTop: 10 },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: 20 },
  pageButton: { backgroundColor: "#2196F3", padding: 10, borderRadius: 5 },
  pageButtonText: { color: "#fff", fontWeight: "bold" },
  pageNumber: { fontSize: 16, fontWeight: "bold" },
  noMealsText: { fontSize: 16, textAlign: "center", color: "#888" },
  bottomButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  viewMealsButton: { backgroundColor: "#FF5722", padding: 10, borderRadius: 5, width: "48%", alignItems: "center" },
  viewMealsButtonText: { color: "#fff", fontWeight: "bold" },
  goHomeButton: { backgroundColor: "#2196F3", padding: 10, borderRadius: 5, width: "48%", alignItems: "center" },
  goHomeButtonText: { color: "#fff", fontWeight: "bold" },
});

export default Ingredients;
