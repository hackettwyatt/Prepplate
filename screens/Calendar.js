import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, StyleSheet, TextInput, Modal, TouchableOpacity, Text, FlatList, Image, Alert, Platform} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const CustomButton = ({ title, onPress, style }) => (
  <TouchableOpacity style={[styles.customButton, style]} onPress={onPress}>
    <Text style={styles.customButtonText}>{title}</Text>
  </TouchableOpacity>
);

const getCurrentDateISO = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (time, ampm) => {
  if (!time) return 'Time not available';
  if (typeof time === 'object' && time.hour != null && time.minute != null && ampm) {
    return `${time.hour}:${time.minute < 10 ? '0' : ''}${time.minute} ${ampm}`;
  }
  if (typeof time === 'string' && ampm) {
    return `${time} ${ampm}`;
  }
  return time;
};

const formatDateForAgendaView = (date) => {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const [year, month, day] = date.split('-');
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('en-US', options);
};

const isValidDate = (dateString) => /^\d{4}-\d{2}-\d{2}$/.test(dateString);

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
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  };

  const getFullDateTime = (date, time, ampm) => {
    const { hours, minutes } = convertTo24HourTime(time, ampm);
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  const fetchMealsAndEvents = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userId = user.uid;
      const eventsSnapshot = await getDocs(collection(db, 'userEvents', userId, 'events'));
      const events = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        if (!isValidDate(data.date) || !data.time) return null;
        const [timePart, ampm] = data.time.split(' ');
        return {
          id: doc.id,
          name: data.name,
          date: data.date,
          time: timePart,
          ampm,
          type: 'event',
          fullDateTime: getFullDateTime(data.date, timePart, ampm)
        };
      }).filter(Boolean);
      const mealsSnapshot = await getDocs(collection(db, 'userMeals', userId, 'scheduledMeals'));
      const meals = mealsSnapshot.docs.map(doc => {
        const data = doc.data();
        if (!isValidDate(data.date)) return null;
        return {
          id: doc.id,
          name: data.mealName,
          date: data.date,
          time: data.time,
          ampm: data.ampm,
          type: 'meal',
          fullDateTime: getFullDateTime(data.date, data.time, data.ampm),
          image: data.mealImage || data.mealimage || null
        };
      }).filter(Boolean);
      const combined = [...events, ...meals].sort((a, b) => a.fullDateTime - b.fullDateTime);
      const newMarkedDates = {};
      combined.forEach(item => {
        newMarkedDates[item.date] = { marked: true, dotColor: item.type === 'meal' ? '#50cebb' : '#ff6347' };
      });
      setItems(combined);
      setMarkedDates(newMarkedDates);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchMealsAndEvents(); }, []);

  const getItemsForSelectedDate = () => items.filter(i => i.date === selectedDate);

  const renderCards = () => (
    <FlatList
      data={getItemsForSelectedDate()}
      renderItem={({ item }) => (
        <View style={styles.eventCard}>
          <Card style={styles.card}><Card.Content>
            <Text style={styles.eventTitle}>{item.name}</Text>
            <Text>{formatTime(item.time, item.ampm)}</Text>
            {item.type === 'meal' && item.image && <Image source={{ uri: item.image }} style={styles.eventImage} />}
          </Card.Content></Card>
          <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.id, item.type)}>
            <Ionicons name="close-circle" size={30} color="#FF5733" />
          </TouchableOpacity>
        </View>
      )}
      keyExtractor={item => item.id}
    />
  );

  const removeItem = async (id, type) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const ref = type === 'meal'
        ? doc(db, 'userMeals', user.uid, 'scheduledMeals', id)
        : doc(db, 'userEvents', user.uid, 'events', id);
      await deleteDoc(ref);
      fetchMealsAndEvents();
    } catch (e) { console.error(e); Alert.alert('Error', Removing `${type}`); }
  };

  const switchToAgendaView = () => setIsCalendarView(false);
  const switchToCalendarView = () => setIsCalendarView(true);

  const navigateAgendaView = (dir) => {
    const [y,m,d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    dt.setDate(dt.getDate() + dir);
    setSelectedDate(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
  };

  const validateInputs = () => {
    if (!eventName || !eventMonth || !eventDay || !eventYear || !eventHour || !eventMinute) {
      Alert.alert('Error', 'Please fill in all fields.');
      return false;
    }
  
    const month = parseInt(eventMonth, 10);
    const day = parseInt(eventDay, 10);
    const year = parseInt(eventYear, 10);
    const hour = parseInt(eventHour, 10);
    const minute = parseInt(eventMinute, 10);
  
    if (isNaN(month) || month < 1 || month > 12) {
      Alert.alert('Error', 'Month must be a number between 1 and 12.');
      return false;
    }
  
    if (isNaN(day) || day < 1 || day > 31) {
      Alert.alert('Error', 'Day must be a number between 1 and 31.');
      return false;
    }
  
    if (isNaN(year) || eventYear.length !== 4 || year < 1000 || year > 9999) {
      Alert.alert('Error', 'Year must be a 4-digit number between 1000 and 9999.');
      return false;
    }
  
    if (isNaN(hour) || hour < 1 || hour > 12) {
      Alert.alert('Error', 'Hour must be a number between 1 and 12.');
      return false;
    }
  
    if (isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert('Error', 'Minute must be a number between 0 and 59.');
      return false;
    }
  
    return true;
  };
  

  const addEvent = async () => {
    if (!validateInputs()) return;
    const date = `${eventYear}-${String(eventMonth).padStart(2,'0')}`-`${String(eventDay).padStart(2,'0')}`;
    const time = `${eventHour}:${eventMinute} ${eventAMPM}`;
    try {
      await addDoc(collection(db,'userEvents',auth.currentUser.uid,'events'),{name:eventName,date,time,createdAt:new Date()});
      setModalVisible(false);
      [setEventName,setEventMonth,setEventDay,setEventYear,setEventHour,setEventMinute].forEach(fn=>fn(''));
      setEventAMPM('AM');
      fetchMealsAndEvents();
    } catch(e){console.error(e);Alert.alert('Error','Adding event');}
  };

  return(
    <SafeAreaView style={styles.container}>
      <View style={styles.buttonContainer}>
        <CustomButton title="Calendar View" onPress={switchToCalendarView} />
        <CustomButton title="Agenda View" onPress={switchToAgendaView} style={{backgroundColor:'#2196F3'}} />
      </View>
      {isCalendarView ? (
        <Calendar markedDates={markedDates} onDayPress={d=>{setSelectedDate(d.dateString);setIsCalendarView(false);}} />
      ):(
        <View style={styles.eventsContainer}>
          <Text style={styles.dateText}>{formatDateForAgendaView(selectedDate)}</Text>
          <View style={styles.navigationButtons}>
            <CustomButton title="Previous" onPress={()=>navigateAgendaView(-1)} style={[styles.navButton,{backgroundColor:'#2196F3'}]} />
            <CustomButton title="Next" onPress={()=>navigateAgendaView
(1)} style={[styles.navButton,{backgroundColor:'#2196F3'}]} />
          </View>
          {renderCards()}
          <CustomButton title="Add Event" onPress={()=>setModalVisible(true)} style={styles.addEventButton} />
        </View>
      )}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Event</Text>
          <TextInput style={styles.eventinput} placeholder="Event Name" value={eventName} onChangeText={setEventName} />
          <View style={styles.datePicker}>
            <TextInput style={styles.input} placeholder="Month" value={eventMonth} onChangeText={setEventMonth} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Day" value={eventDay} onChangeText={setEventDay} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Year" value={eventYear} onChangeText={setEventYear} keyboardType="numeric" />
          </View>
          <View style={styles.timePicker}>
  <TextInput style={[styles.input, styles.inputSmall]} placeholder="Hour" value={eventHour} onChangeText={setEventHour} keyboardType="numeric" />
  <Text style={styles.colon}>:</Text>
  <TextInput style={[styles.input, styles.inputSmall]} placeholder="Minute" value={eventMinute} onChangeText={setEventMinute} keyboardType="numeric" />
  {Platform.OS === 'ios' ? (
    <RNPickerSelect
      items={[
        { label: 'AM', value: 'AM', color: '#000' },
        { label: 'PM', value: 'PM', color: '#000' }
      ]}
      value={eventAMPM}
      onValueChange={setEventAMPM}
      placeholder={{ label: 'AM/PM', value: '', color: '#000' }}
      style={pickerSelectStyles}
      useNativeAndroidPickerStyle={false}
      Icon={() => (
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>▾</Text>
        </View>
      )}
    />
  ) : (
    <Picker selectedValue={eventAMPM} onValueChange={setEventAMPM} style={styles.inputpicker}>
      <Picker.Item label="AM" value="AM" />
      <Picker.Item label="PM" value="PM" />
    </Picker>
  )}
</View>

          <View style={styles.modalButtons}>
            <CustomButton title="Add" onPress={addEvent} style={styles.addEvent} />
            <CustomButton title="Cancel" onPress={()=>setModalVisible(false)} style={styles.cancelBtn} />
          </View>
        </View>
      </Modal>
      <View style={styles.homeButton}>
        <CustomButton title="Go Home" onPress={()=>navigation.navigate('Home')} style={{backgroundColor:'#2196F3'}} />
      </View>
    </SafeAreaView>
  );
};
const INPUT_HEIGHT = 50;
const INPUT_BORDER_RADIUS = 8;

const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize:16,paddingVertical:12,paddingHorizontal:10,borderWidth:1,borderColor:'#ccc',borderRadius:4,color:'black',paddingRight:30,minWidth:100,textAlign:'center' },
  inputAndroid: { fontSize:16,paddingHorizontal:10,paddingVertical:8,borderWidth:0.5,borderColor:'#ccc',borderRadius:8,color:'black',paddingRight:30,minWidth:100,textAlign:'center' }
});

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F4F1E3',paddingTop:40,paddingHorizontal:20},
  buttonContainer:{flexDirection:'row',justifyContent:'space-between',marginBottom:20},
  customButton:{backgroundColor:'#205a35',paddingVertical:10,paddingHorizontal:15,borderRadius:5,alignItems:'center',margin:5},
  customButtonText:{color:'#fff',fontWeight:'bold'},
  navButton:{flex:1,marginHorizontal:5},
  eventsContainer:{flex:1},
  dateText:{fontSize:24,fontWeight:'bold',marginBottom:10},
  navigationButtons:{flexDirection:'row',justifyContent:'space-between',marginBottom:10},
  eventCard:{flexDirection:'column',marginBottom:15,backgroundColor:'#fff',borderRadius:10,padding:10,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.3,shadowRadius:2},
  card:{padding:10},
  eventTitle:{fontSize:18,fontWeight:'bold'},
  eventImage:{width:100,height:100,marginTop:10},
  removeButton:{position:'absolute',top:10,right:10},
  addEventButton:{backgroundColor:'#205a35',paddingVertical:10,borderRadius:5,marginVertical:10},
  modalContainer:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#F4F1E3',padding:20,margin:20,borderRadius:10},
  modalTitle:{fontSize:24,fontWeight:'bold',marginBottom:20},
  input: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff', padding: 14, marginBottom: 10, width: '80%', height: 40, fontSize: 18, borderRadius: 8, textAlign: 'center',},
  eventinput:{borderWidth:1,borderColor:'#ccc',backgroundColor:'#fff',padding:10,marginBottom:10,width:'90%'},
  datePicker:{marginBottom:10,alignItems:'center'},
  timePicker:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',width:'100%',marginBottom:10},
  inputSmall: { width: '25%', height: 50, fontSize: 16, padding: 10, textAlign: 'center',},
  inputpicker:{height:50,width:100},
  modalButtons:{flexDirection:'row',justifyContent:'space-around',width:'100%'},
  addEvent:{backgroundColor:'#205a35'},
  cancelBtn:{backgroundColor:'#FF6347'},
  homeButton:{marginTop:20,alignSelf:'center',width:'50%'},
  iconContainer: { position: 'absolute', right: 8, top: 8, width: 24, height: 24, justifyContent: 'center',  alignItems: 'center',},
  icon: { fontSize: 18, color: '#000',},
  pickerAndroid: { height: 40, width: 90, borderColor: '#ccc', borderWidth: 1, borderRadius: 5,backgroundColor: '#fff', justifyContent: 'center', paddingHorizontal: 8, color: '#000', },
});

export default CalendarApp;
