import React, { useState, useEffect } from 'react';
import { SafeAreaView, Text, ScrollView, Image, StyleSheet, View, TouchableOpacity, Modal, Button, TextInput } from 'react-native';
import { auth, db } from './firebaseConfig';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import axios from 'axios';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

const NUTRITIONX_API_KEY = 'a498acfe82eb362fa70195893e03ff66';
const NUTRITIONX_APP_ID = '7f3ca66e';

const mealNameMap = {
  'bistek': 'bistek tagalog',
  'prawn curry': 'shrimp curry',
  'kung po chicken': 'kung pao chicken',
  'spaghetti alla carbonara': 'carbonara',
  'kung po prawns': 'kung pao shrimp',
  'ma po tofu': 'mapo tofu',
  'broccoli & stilton soup': 'N/A',
};

// 1) define extractNutrition first, so it’s always hoisted
function extractNutrition(food) {
  const fmt = v => (v === 0 ? '0.0' : v ?? 'N/A');
  return {
    servingQty:         fmt(food.serving_qty),
    servingUnit:        food.serving_unit || 'g',
    servingWeightGrams: fmt(food.serving_weight_grams),
    calories:           fmt(food.nf_calories),
    fat:                fmt(food.nf_total_fat),
    carbs:              fmt(food.nf_total_carbohydrate),
    protein:            fmt(food.nf_protein),
    sugars:             fmt(food.nf_sugars),
    fiber:              fmt(food.nf_dietary_fiber),
    sodium:             fmt(food.nf_sodium),
    cholesterol:        fmt(food.nf_cholesterol),
  };
}

const fetchNutritionForMeal = async (mealName) => {
  // normalize & → and, lowercase, trim
  const original    = mealName.toLowerCase().replace(/&/g, 'and').trim();
  const mappedName  = mealNameMap[original] || original;
  if (mappedName === 'N/A') return null;

  const searchTerm  = mappedName;           // already lowercased/normalized
  const words       = searchTerm.split(/\s+/);

  // pick logic: strict for multi-word, loose allowed only for single words
  const strictMatch = foods => foods.find(f =>
    words.every(w => f.food_name.toLowerCase().includes(w))
  );
  const looseMatch  = foods => foods[0] || null;
  const pick        = foods =>
    words.length > 1 ? strictMatch(foods) : (strictMatch(foods) || looseMatch(foods));

  // NATURAL NUTRIENTS endpoint
  try {
    const { data } = await axios.post(
      'https://trackapi.nutritionix.com/v2/natural/nutrients',
      { query: mappedName },
      { headers: {
          'x-app-id': NUTRITIONX_APP_ID,
          'x-app-key': NUTRITIONX_API_KEY,
      }}
    );
    const foods = data.foods || [];
    const match = pick(foods);
    if (match) return extractNutrition(match);
  } catch (e) {
    console.warn('NL lookup failed:', e.message);
  }

  // BRANDED SEARCH fallback
  try {
    const inst = await axios.get(
      'https://trackapi.nutritionix.com/v2/search/instant',
      {
        params: { query: mappedName },
        headers: {
          'x-app-id': NUTRITIONX_APP_ID,
          'x-app-key': NUTRITIONX_API_KEY,
        },
      }
    );
    const branded = inst.data.branded || [];
    const best    = pick(branded);
    if (best && best.nix_item_id) {
      const item = await axios.get(
        'https://trackapi.nutritionix.com/v2/search/item',
        {
          params: { nix_item_id: best.nix_item_id },
          headers: {
            'x-app-id': NUTRITIONX_APP_ID,
            'x-app-key': NUTRITIONX_API_KEY,
          },
        }
      );
      const food = item.data.foods?.[0];
      if (food) return extractNutrition(food);
    }
  } catch (e) {
    console.warn('Branded lookup failed:', e.message);
  }

  console.log('No nutrition data found for', mealName);
  return null;
};

const Meals = () => {
  const navigation = useNavigation();

  const [savedMeals, setSavedMeals] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [nutritionFacts, setNutritionFacts] = useState(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAMPM, setSelectedAMPM] = useState('AM');

  const loadSavedMeals = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userMealsRef = collection(db, 'userMeals', user.uid, 'meals');
      const mealSnapshot = await getDocs(userMealsRef);
      const mealsList = mealSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedMeals(mealsList);
    } catch (error) {
      console.error('Error loading saved meals:', error);
    }
  };

  const fetchNutritionFacts = async (meal) => {
    if (!meal) return;
    console.log('Fetching nutrition facts for:', meal.strMeal);
    const nutritionData = await fetchNutritionForMeal(meal.strMeal);
    if (nutritionData) {
      setNutritionFacts({
        calories: nutritionData.calories,
        fat: nutritionData.fat,
        carbs: nutritionData.carbs,
        protein: nutritionData.protein,
        sugars: nutritionData.sugars,
        fiber: nutritionData.fiber,
        sodium: nutritionData.sodium,
        cholesterol: nutritionData.cholesterol,
        servingWeightGrams: nutritionData.servingWeightGrams,

      });
    } else {
      setNutritionFacts(null);
    }
  };

  const handleScheduleMeal = async () => {
    try {
      if (!selectedDate) {
        alert('Please select a date');
        return;
      }
      const hourInt = parseInt(selectedHour, 10);
      const minuteInt = parseInt(selectedMinute, 10);
      if (isNaN(hourInt) || hourInt < 1 || hourInt > 12) {
        alert('Please enter a valid hour (1-12)');
        return;
      }
      if (isNaN(minuteInt) || minuteInt < 0 || minuteInt > 59) {
        alert('Please enter a valid minute (0-59)');
        return;
      }
      const formattedHour = selectedHour.padStart(2, '0');
      const formattedMinute = selectedMinute.padStart(2, '0');
      const time = `${formattedHour}:${formattedMinute}`;
      const user = auth.currentUser;
      if (!user) return;
      const mealImage = selectedMeal.strMealThumb;
      const mealName = selectedMeal.strMeal;

      const scheduledMealsRef = collection(db, 'userMeals', user.uid, 'scheduledMeals');
      const mealsSnapshot = await getDocs(scheduledMealsRef);
      const scheduledMeals = mealsSnapshot.docs.map(doc => doc.data());
      const conflict = scheduledMeals.some(m => m.date === selectedDate && m.time === time && m.ampm === selectedAMPM);
      if (conflict) {
        alert('A meal is already scheduled at this time.');
        return;
      }

      const scheduleRef = doc(db, 'userMeals', user.uid, 'scheduledMeals', `${selectedDate}_${time}_${selectedAMPM}`);
      await setDoc(scheduleRef, {
        mealId: selectedMeal.id,
        mealImage,
        mealName,
        time,
        ampm: selectedAMPM,
        createdAt: new Date().toISOString(),
        date: selectedDate,
      });

      setScheduleModalVisible(false);
      setSelectedDate(null);
      alert('Meal scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling meal:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) loadSavedMeals();
      else setSavedMeals([]);
    });
    return unsubscribe;
  }, []);

  const closeModal = () => {
    setModalVisible(false);
    setSelectedMeal(null);
  };

  const handleMealClick = async (meal) => {
    console.log('Meal clicked:', meal.strMeal);
    setSelectedMeal(meal);
    setModalVisible(true);
    setNutritionFacts(null);
    await fetchNutritionFacts(meal);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Saved Meals</Text>

      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {savedMeals.length > 0 ? (
            savedMeals.map((meal) => (
              <TouchableOpacity key={meal.id} onPress={() => handleMealClick(meal)}>
                <View style={styles.mealCard}>
                  <Image source={{ uri: meal.strMealThumb }} style={styles.mealImage} />
                  <Text style={styles.mealName}>{meal.strMeal}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noMealsText}>No saved meals found</Text>
          )}
        </ScrollView>

        <View style={styles.goHomeButtonContainer}>
          <Button title="Go Home" onPress={() => navigation.navigate('Home')} />
        </View>
      </View>

      {selectedMeal && (
  <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
    <View style={styles.modalBackground}>
      <View style={styles.modalContent}>
        <ScrollView style={styles.modalScroll}>
          <Text style={styles.modalHeader}>{selectedMeal.strMeal}</Text>
          <Image source={{ uri: selectedMeal.strMealThumb }} style={styles.modalImage} />
          <Text style={styles.modalSectionHeader}>Recipe:</Text>
          {selectedMeal.strInstructions ? (
            /^\s*\d+(\s*[\.\-\)]|\s)/.test(selectedMeal.strInstructions.trim()) ? (
              <Text style={styles.recipeStep}>{selectedMeal.strInstructions}</Text>
            ) : (
              selectedMeal.strInstructions
                .split('. ')
                .filter((s) => s.trim() !== '')
                .map((s, i) => (
                  <Text key={i} style={styles.recipeStep}>
                    {i + 1}. {s}.
                  </Text>
                ))
            )
          ) : (
            <Text style={styles.modalText}>No instructions available</Text>
          )}

          <Text style={styles.modalSectionHeader}>Nutrition:</Text>
          {nutritionFacts ? (
            <View style={styles.nutritionContainer}>
             <Text style={styles.nutritionText}>Serving Size: {nutritionFacts.servingWeightGrams} g</Text>
              <Text style={styles.nutritionText}>Calories: {nutritionFacts.calories}</Text>
              <Text style={styles.nutritionText}>Fat: {nutritionFacts.fat} g</Text>
              <Text style={styles.nutritionText}>Carbs: {nutritionFacts.carbs} g</Text>
              <Text style={styles.nutritionText}>Protein: {nutritionFacts.protein} g</Text>
              <Text style={styles.nutritionText}>Sugars: {nutritionFacts.sugars} g</Text>
              <Text style={styles.nutritionText}>Fiber: {nutritionFacts.fiber} g</Text>
              <Text style={styles.nutritionText}>Sodium: {nutritionFacts.sodium} mg</Text>
              <Text style={styles.nutritionText}>Cholesterol: {nutritionFacts.cholesterol} mg</Text>
            </View>
          ) : (
            <Text style={styles.noNutritionText}>No Nutrition Information Available</Text>
          )}

          <TouchableOpacity style={styles.removeButton}>
            <Text style={styles.removeButtonText}>Remove Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scheduleButton} onPress={() => setScheduleModalVisible(true)}>
            <Text style={styles.scheduleButtonText}>Schedule Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closebtn} onPress={closeModal}>
            <Text style={styles.scheduleButtonText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  </Modal>
)}

{scheduleModalVisible && (
  <Modal animationType="slide" transparent visible={scheduleModalVisible} onRequestClose={() => setScheduleModalVisible(false)}>
    <View style={styles.modalBackground}>
      <View style={styles.modalContent}>
        <Text style={styles.modalHeader}>Schedule Meal</Text>
        <Calendar
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: 'blue', selectedTextColor: 'white' },
          }}
          onDayPress={(day) => setSelectedDate(day.dateString)}
        />
        <View style={styles.timePickerContainer}>
          <Text style={styles.timePickerLabel}>Select Time:</Text>
          <View style={styles.timeInputContainer}>
            <TextInput
              style={styles.timeInput}
              keyboardType="numeric"
              maxLength={2}
              value={selectedHour}
              onChangeText={setSelectedHour}
              placeholder="Hour"
            />
            <Text style={styles.timeSeparator}>:</Text>
            <TextInput
              style={styles.timeInput}
              keyboardType="numeric"
              maxLength={2}
              value={selectedMinute}
              onChangeText={setSelectedMinute}
              placeholder="Minute"
            />
            <View style={{ position: 'relative', width: 110, height: 50 }}>
             <Picker
              selectedValue={selectedAMPM}
               style={styles.amPmPicker}
              onValueChange={setSelectedAMPM}
              >
        <Picker.Item label="AM" value="AM" />
        <Picker.Item label="PM" value="PM" />
        </Picker>
        </View>

          </View>
        </View>
        <TouchableOpacity style={styles.scheduleButton} onPress={handleScheduleMeal}>
          <Text style={styles.scheduleButtonText}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closebtn} onPress={() => setScheduleModalVisible(false)}>
          <Text style={styles.scheduleButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F1E3', paddingTop: 20, paddingHorizontal: 10 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  mealCard: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  mealImage: { width: 90, height: 80, borderRadius: 10, marginRight: 10 },
  mealName: { fontSize: 20, fontWeight: 'bold', flex: 1 },
  noMealsText: { textAlign: 'center', fontSize: 18, color: '#999' },
  goHomeButtonContainer: { marginTop: 10, width: '50%', alignSelf: 'center' },
  modalBackground: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '80%', backgroundColor: 'white', padding: 20, borderRadius: 10, elevation: 5 },
  modalScroll: { marginBottom: 20 },
  modalHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
  modalSectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  modalText: { fontSize: 16, marginBottom: 5 },
  removeButton: { backgroundColor: '#007BFF', paddingVertical: 10, borderRadius: 5, marginVertical: 5 },
  removeButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  scheduleButton: { backgroundColor: '#33cc33', paddingVertical: 10, borderRadius: 5, marginVertical: 5 },
  scheduleButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  timePickerContainer: { marginVertical: 10 },
  timePickerLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  timeInputContainer: { flexDirection: 'row', alignItems: 'center', zIndex: 10,},
  timeInput: { width: 50, height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, textAlign: 'center', marginRight: 5 },
  timeSeparator: { fontSize: 20, fontWeight: 'bold' },
  amPmPicker: { width: 110, height: 50, zIndex: 10,  },
  recipeStep: { fontSize: 16, marginBottom: 5, lineHeight: 22, paddingLeft: 10 },
  closeButton: { backgroundColor: '#ff3333', paddingVertical: 10, borderRadius: 5, marginVertical: 5 },
  closebtn: { backgroundColor: '#ff3333', paddingVertical: 10, borderRadius: 5, marginVertical: 5 },
  noNutritionText: {
    fontSize: 16,
    marginBottom: 5,
    color: 'red',
    fontWeight: 'bold',
    textAlign: 'center',
},
nutritionText: {
  fontSize: 16,
  marginVertical: 2,
},

});

export default Meals;
