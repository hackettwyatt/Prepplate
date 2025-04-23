import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, StyleSheet, Button, TextInput, Modal, TouchableOpacity, Text, FlatList, Image, Alert } from 'react-native';
import { Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const getCurrentDateISO = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (time, ampm) => {
  if (!time) return 'Time not available';

  let formattedTime = time;
  if (typeof time === 'object' && time.hour != null && time.minute != null && ampm) {
    formattedTime = `${time.hour}:${time.minute < 10 ? '0' : ''}${time.minute} ${ampm}`;
  }
  if (typeof time === 'string' && ampm) {
    formattedTime = `${time} ${ampm}`;
  }

  return formattedTime;
};


const formatCreatedAt = (timestamp) => {
  if (!timestamp || !timestamp.seconds) {
    return 'No timestamp available';
  }
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleString();
};

const formatDateForAgendaView = (date) => {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const [year, month, day] = date.split('-');
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('en-US', options);
};

const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString);
};

const CalendarApp = () => {
  const navigation = useNavigation();

  const [items, setItems] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(getCurrentDateISO());
  const [isCalendarView, setIsCalendarView] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventMonth, setEventMonth] = useState('');
  const [eventDay, setEventDay] = useState('');
  const [eventYear, setEventYear] = useState('');
  const [eventHour, setEventHour] = useState('');
  const [eventMinute, setEventMinute] = useState('');
  const [eventAMPM, setEventAMPM] = useState('AM');

  const convertTo24HourTime = (time, ampm) => {
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours !== 12) {
      hours += 12; 
    }
    if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    return { hours, minutes };
  };
  
  const getFullDateTime = (date, time, ampm) => {
    const { hours, minutes } = convertTo24HourTime(time, ampm);
    const [year, month, day] = date.split('-').map(Number); ``
    const fullDateTime = new Date(year, month - 1, day, hours, minutes);
    console.log('Parsed fullDateTime:', fullDateTime);
    return fullDateTime;
  };
  
  const fetchMealsAndEvents = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const userId = currentUser.uid;
  
      // 1) Fetch events
      const eventsSnapshot = await getDocs(
        collection(db, 'userEvents', userId, 'events')
      );
      const events = eventsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          // data.time is something like "5:30 PM"
          if (!isValidDate(data.date) || !data.time) return null;
  
          // split off the AM/PM
          const [timePart, ampm] = data.time.split(' ');
          return {
            id: doc.id,
            name: data.name,
            date: data.date,
            time: timePart,      // e.g. "5:30"
            ampm,                // e.g. "PM"
            type: 'event',
            fullDateTime: getFullDateTime(data.date, timePart, ampm)
          };
        })
        .filter(Boolean);
  
      // 2) Fetch meals (unchanged; you already do this correctly)
      const scheduledMealsSnapshot = await getDocs(
        collection(db, 'userMeals', userId, 'scheduledMeals')
      );
      const meals = scheduledMealsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          if (!isValidDate(data.date)) return null;
          return {
            id: doc.id,
            name: data.mealName,
            date: data.date,
            time: data.time,           // already just "HH:MM"
            ampm: data.ampm,           // already "AM" or "PM"
            type: 'meal',
            fullDateTime: getFullDateTime(data.date, data.time, data.ampm),
            image: data.mealImage || data.mealimage || null,
            recipe: data.mealRecipe || ''
          };
        })
        .filter(Boolean);
  
      // 3) Merge & sort
      const combined = [...events, ...meals].sort(
        (a, b) => a.fullDateTime - b.fullDateTime
      );
  
      // 4) Build markedDates and update state…
      const newMarkedDates = {};
      combined.forEach(item => {
        if (!newMarkedDates[item.date]) {
          newMarkedDates[item.date] = {
            marked: true,
            dotColor: item.type === 'meal' ? '#50cebb' : '#ff6347'
          };
        }
      });
  
      setItems(combined);
      setMarkedDates(newMarkedDates);
    } catch (error) {
      console.error('Error fetching meals and events:', error);
    }
  };
  
  useEffect(() => {
    fetchMealsAndEvents();
  }, []);
  

  const getItemsForSelectedDate = () => items.filter(item => item.date === selectedDate);

  const renderCards = () => (
    <FlatList
      data={getItemsForSelectedDate()}
      renderItem={({ item }) => (
        <View style={styles.eventCard}>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.eventTitle}>{item.name}</Text>
              <Text>{formatTime(item.time, item.ampm)}</Text>
              {item.type === 'meal' && item.image && <Image source={{ uri: item.image }} style={styles.eventImage} />}
            </Card.Content>
          </Card>
          <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.id, item.type)}>
            <Ionicons name="close-circle" size={30} color="#FF5733" />
          </TouchableOpacity>
        </View>
      )}
      keyExtractor={item => item.id || item.name || JSON.stringify(item.time)}
    />
  );

  const removeItem = async (itemId, itemType) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('No authenticated user found');
        return;
      }
      const userId = currentUser.uid;
      const itemRef = itemType === 'meal'
        ? doc(db, 'userMeals', userId, 'scheduledMeals', itemId)
        : doc(db, 'userEvents', userId, 'events', itemId);

      await deleteDoc(itemRef);
      await fetchMealsAndEvents();
    } catch (error) {
      console.error(`Error removing ${itemType}:`, error);
      Alert.alert('Error', `There was an issue removing the ${itemType}.`);
    }
  };

  const switchToAgendaView = () => setIsCalendarView(false);
  const switchToCalendarView = () => setIsCalendarView(true);

  const navigateAgendaView = (direction) => {
    const [year, month, day] = selectedDate.split('-');
    const currentDate = new Date(year, month - 1, day);
    currentDate.setDate(currentDate.getDate() + direction);
    const newYear = currentDate.getFullYear();
    const newMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const newDay = String(currentDate.getDate()).padStart(2, '0');
    setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
  };

  const validateInputs = () => {
    if (!eventName || !eventMonth || !eventDay || !eventYear || !eventHour || !eventMinute) {
      Alert.alert('Error', 'Please fill out all fields.');
      return false;
    }
    const month = parseInt(eventMonth, 10);
    const day = parseInt(eventDay, 10);
    const year = parseInt(eventYear, 10);
    const hour = parseInt(eventHour, 10);
    const minute = parseInt(eventMinute, 10);
    if (isNaN(month) || month < 1 || month > 12 ||
        isNaN(day) || day < 1 || day > 31 ||
        isNaN(year) || year < 1000 || year > 9999 ||
        isNaN(hour) || hour < 1 || hour > 12 ||
        isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert('Error', 'Please enter valid date and time values.');
      return false;
    }
    return true;
  };

  const addEvent = async () => {
    if (!validateInputs()) return;
  
    // Add leading zero for single digit months (1-9)
    const formattedMonth = eventMonth < 10 ? `0${eventMonth}` : eventMonth;
  
    const eventDate = `${eventYear}-${formattedMonth}-${eventDay}`;
    const eventTime = `${eventHour}:${eventMinute} ${eventAMPM}`;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const userId = currentUser.uid;
    try {
      await addDoc(collection(db, 'userEvents', userId, 'events'), {
        name: eventName,
        date: eventDate,
        time: eventTime,
        createdAt: new Date(),
      });
      setModalVisible(false);
      setEventName('');
      setEventMonth('');
      setEventDay('');
      setEventYear('');
      setEventHour('');
      setEventMinute('');
      setEventAMPM('AM');
      fetchMealsAndEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'There was an issue adding your event.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="Switch to Calendar View" onPress={switchToCalendarView} color="#205a35" />
        <Button title="Switch to Agenda View" onPress={switchToAgendaView} />
      </View>

      {isCalendarView ? (
        <Calendar
          markedDates={markedDates}
          onDayPress={(day) => {
            setSelectedDate(day.dateString);
            setIsCalendarView(false);
          }}
        />
      ) : (
        <View style={styles.eventsContainer}>
          <Text style={styles.dateText}>{formatDateForAgendaView(selectedDate)}</Text>
          <View style={styles.navigationButtons}>
            <Button title="Previous Day" onPress={() => navigateAgendaView(-1)} />
            <Button title="Next Day" onPress={() => navigateAgendaView(1)} />
          </View>
          {renderCards()}
          <TouchableOpacity style={styles.addEventButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addEventText}>Add Event</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Event</Text>
          <View style={styles.datePicker}>
            <TextInput style={styles.eventinput} placeholder="Event Name" value={eventName} onChangeText={setEventName} />
            <TextInput style={styles.input} placeholder="Month" value={eventMonth} onChangeText={setEventMonth} />
            <TextInput style={styles.input} placeholder="Day" value={eventDay} onChangeText={setEventDay} />
            <TextInput style={styles.input} placeholder="Year" value={eventYear} onChangeText={setEventYear} />
          </View>
          <View style={styles.timePicker}>
            <TextInput style={[styles.input, styles.inputSmall]} placeholder="Hour" value={eventHour} onChangeText={setEventHour} />
            <TextInput style={[styles.input, styles.inputSmall]} placeholder="Minute" value={eventMinute} onChangeText={setEventMinute} />
            <Picker selectedValue={eventAMPM} onValueChange={setEventAMPM} style={styles.inputpicker}>
              <Picker.Item label="AM" value="AM" />
              <Picker.Item label="PM" value="PM" />
            </Picker>
          </View>
          <TouchableOpacity style={styles.addEvent} onPress={addEvent}>
            <Text style={styles.addEventText}>Add Event</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancleBtn} onPress={() => setModalVisible(false)}>
            <Text style={styles.addEventText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <View style={styles.homeButton}>
                <Button title="Go Home" onPress={() => navigation.navigate("Home")} />
              </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F1E3', paddingTop: 40, paddingHorizontal: 20,},
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20,},
  eventsContainer: { flex: 1,},
  dateText: { fontSize: 24, fontWeight: 'bold',  marginBottom: 10,},
  navigationButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10,},
  eventCard: { flexDirection: 'column',
     marginBottom: 15, 
     backgroundColor: '#F4F1E3', 
     borderRadius: 10, 
     padding: 10, 
     shadowColor: '#000', 
     shadowOffset: { width: 0, height: 1 }, 
     shadowOpacity: 0.3, 
     shadowRadius: 2,},
  card: { padding: 10,},
  eventTitle: { fontSize: 18, fontWeight: 'bold',},
  eventImage: {  width: 100, height: 100, marginTop: 10,},
  removeButton: { position: 'absolute', top: 10, right: 10,},
  addEventButton: { backgroundColor: '#205a35', paddingVertical: 10, borderRadius: 5, marginVertical: 10, marginBottom: 20,},
  addEventText: { color: 'white', textAlign: 'center', fontWeight: 'bold',},
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F1E3', padding: 20,},
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20,},
  input: { borderWidth: 1, borderColor: '#ccc', backgroundColor: "#fff", padding: 10, marginBottom: 10, width: '80%',},
  eventinput: { borderWidth: 1, borderColor: '#ccc', backgroundColor: "#fff", padding: 10, marginBottom: 10, width: '90%',},
  datePicker: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, width: '100%',},
  timePicker: { flexDirection: 'row', borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, width: '100%', justifyContent: 'space-between',},
  inputSmall: { width: '30%',},
  inputpicker: { height: 50, width: 105, alignSelf: 'center',},
  cancleBtn: { backgroundColor: '#FF6347', paddingVertical: 10, borderRadius: 5, marginVertical: 10, width: 100,},
  addEvent: { backgroundColor: '#205a35', paddingVertical: 10, borderRadius: 5, marginVertical: 10, width: 100,},
  addEventText: { color: 'white', textAlign: 'center', fontWeight: 'bold',},
  homeButton: { marginBottom: 15, alignSelf: "center", width: "50%",},
});

export default CalendarApp