import * as Location from 'expo-location';
import { GoogleMaps } from "expo-maps";
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';


// Custom Circle Marker Component
const CustomCircleMarker = ({ color, size, label, borderColor = '#FFF' }) => {
  return (
    <View style={[styles.markerContainer, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderColor }]}>
      {label && <Text style={styles.markerText}>{label}</Text>}
    </View>
  );
};

// Custom Alert Modal Component
const CustomAlertModal = ({ visible, title, message, onClose }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <TouchableOpacity onPress={onClose} style={styles.modalButton}>
          <Text style={styles.modalButtonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default function Index() {
  const { width, height } = Dimensions.get('window');
  const ASPECT_RATIO = width / height;
  const LATITUDE_DELTA = 0.0922;
  const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
  const [showInputs, setShowInputs] = useState(false);

  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [initialRegion, setInitialRegion] = useState(null);
  const [isLoadingLocation, setLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoordinate, setRouteCoordinate] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [pickupAddressText, setPickupAddressText] = useState('');
  const [destinationAddressText, setDestinationAddressText] = useState('');

  // Autocomplete states
  const [pickupPredictions, setPickupPredictions] = useState([]);
  const [destinationPredictions, setDestinationPredictions] = useState([]);
  const [showPickupPredictions, setShowPickupPredictions] = useState(false);
  const [showDestinationPredictions, setShowDestinationPredictions] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false); // New state for prediction loading

  // Custom Alert Modal State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState('');
  const [alertModalMessage, setAlertModalMessage] = useState('');

  const GOOGLE_MAPS_API_KEY = "AIzaSyAxVriB1UsbVdbBbrWQTAnAohoxwKVLXPA"; 

  // Debounce ref for autocomplete
  const debounceTimeout = useRef(null);

  // Function to show custom alert
  const showCustomAlert = (title, message) => {
    setAlertModalTitle(title);
    setAlertModalMessage(message);
    setShowAlertModal(true);
  };

  // Function to decode encoded polylines from Google Directions API
  const decodePolyline = (encoded) => {
    let points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ latitude: (lat / 1e5), longitude: (lng / 1e5) });
    }
    return points;
  };

  // Effect to request location permission and get initial user location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showCustomAlert(
          'Location Permission Denied',
          'Permission to access location was denied. Cannot show your location on the map.'
        );
        setHasLocationPermission(false);
        setLoadingLocation(false);
        return;
      }
      setHasLocationPermission(true);
      try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = currentLocation.coords;

        setUserLocation({ latitude, longitude });
        setInitialRegion({
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
        setPickupLocation({ latitude, longitude }); // Set initial pickup to user's location
        // Reverse geocode to get address for initial pickup
        const reverseGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        const reverseGeocodeResponse = await fetch(reverseGeocodeUrl);
        const reverseGeocodeJson = await reverseGeocodeResponse.json();
        if (reverseGeocodeJson.results && reverseGeocodeJson.results.length > 0) {
          setPickupAddressText(reverseGeocodeJson.results[0].formatted_address);
        } else {
          setPickupAddressText("Your Current Location"); // Fallback
        }
      } catch (error) {
        console.error("Error getting current location:", error);
        showCustomAlert("Location Error", "Failed to get current location. Please ensure GPS is enabled.");
        setInitialRegion({
          latitude: 14.5995, // Default to Manila
          longitude: 120.9842,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  // Effect to fetch and display route when pickup or destination changes
  useEffect(() => {
    const fetchAndDisplayRoute = async () => {
      if (!pickupLocation || !destination) {
        setRouteCoordinate([]);
        return;
      }
      setLoadingRoute(true);
      try {
        const originLat = pickupLocation.latitude;
        const originLng = pickupLocation.longitude;
        const destLat = destination.latitude;
        const destLng = destination.longitude;

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const json = await response.json();

        if (json.routes && json.routes.length > 0) {
          const points = json.routes[0].overview_polyline.points;
          const decodedPoints = decodePolyline(points);
          setRouteCoordinate(decodedPoints);

          const bounds = json.routes[0].bounds;
          if (bounds) {
            const northEast = bounds.northeast;
            const southWest = bounds.southwest;
            setInitialRegion({
              latitude: (northEast.lat + southWest.lat) / 2,
              longitude: (northEast.lng + southWest.lng) / 2,
              latitudeDelta: Math.abs(northEast.lat - southWest.lat) * 1.5,
              longitudeDelta: Math.abs(northEast.lng - southWest.lng) * 1.5 * ASPECT_RATIO,
            });
          }
        } else {
          showCustomAlert("No Route Found", "Could not find a route between the selected locations. Please try different points.");
          setRouteCoordinate([]);
        }
      } catch (error) {
        console.error("Error fetching route:", error);
        showCustomAlert("Route Error", "Failed to fetch route. Please check your API key, network connection, and ensure the Directions API is enabled in Google Cloud.");
        setRouteCoordinate([]);
      } finally {
        setLoadingRoute(false);
      }
    };
    fetchAndDisplayRoute();
  }, [pickupLocation, destination]);

  // Function to geocode an address string to coordinates (used for manual entry fallback)
  const geocodeAddress = async (address, type) => {
    if (!address) {
      showCustomAlert("Input Missing", `Please enter an address for ${type}.`);
      return null;
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const json = await response.json();

      console.log("Autocomplete JSON:", json);
      if (json.status !== 'OK') {
        showCustomAlert("Autocomplete Error", `Google returned status: ${json.status}`);
      }

      if (json.results && json.results.length > 0) {
        const { lat, lng } = json.results[0].geometry.location;
        return { latitude: lat, longitude: lng };
      } else {
        showCustomAlert("Address Not Found", `Could not find coordinates for "${address}". Please try a more specific address.`);
        return null;
      }
    } catch (error) {
      console.error(`Error geocoding ${type} address:`, error);
      showCustomAlert("Geocoding Error", `Failed to geocode address for ${type}. Please check your network connection.`);
      return null;
    }
  };

  // Handle "Get Route" button press (fallback for manual entry if autocomplete not used)
  const handleGetRoute = async () => {
    setLoadingRoute(true); // Start loading for geocoding and route
    const pickupCoords = await geocodeAddress(pickupAddressText, "pickup");
    const destinationCoords = await geocodeAddress(destinationAddressText, "destination");

    if (pickupCoords && destinationCoords) {
      setPickupLocation(pickupCoords);
      setDestination(destinationCoords);
    } else {
      setLoadingRoute(false); // Stop loading if geocoding failed
    }
  };

  // Autocomplete functionality
  const fetchPlacePredictions = (input, type) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (input.length < 3) { // Only fetch if input is at least 3 characters
      if (type === 'pickup') setPickupPredictions([]);
      else setDestinationPredictions([]);
      setLoadingPredictions(false); // Stop loading if input is too short
      return;
    }

    setLoadingPredictions(true); // Start loading predictions
    debounceTimeout.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&components=country:ph`; // Restrict to Philippines
        const response = await fetch(url);
        const json = await response.json();

        if (json.predictions) {
          if (type === 'pickup') {
            setPickupPredictions(json.predictions);
            setShowPickupPredictions(true);
          } else {
            setDestinationPredictions(json.predictions);
            setShowDestinationPredictions(true);
          }
        }
      } catch (error) {
        console.error("Error fetching place predictions:", error);
        showCustomAlert("Autocomplete Error", "Failed to fetch address suggestions. Please check your API key and network connection:");
      } finally {
        setLoadingPredictions(false); // Stop loading predictions
      }
    }, 500); // Debounce for 500ms
  };

  const handlePredictionSelect = async (prediction, type) => {
    setLoadingPredictions(true); // Start loading for place details
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(detailsUrl);
      const json = await response.json();

      if (json.result && json.result.geometry) {
        const { lat, lng } = json.result.geometry.location;
        const coordinates = { latitude: lat, longitude: lng };

        if (type === 'pickup') {
          setPickupAddressText(prediction.description);
          setPickupLocation(coordinates);
          setPickupPredictions([]);
          setShowPickupPredictions(false);
        } else {
          setDestinationAddressText(prediction.description);
          setDestination(coordinates);
          setDestinationPredictions([]);
          setShowDestinationPredictions(false);
        }
      } else {
        showCustomAlert("Place Details Error", "Could not retrieve details for the selected place.");
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      showCustomAlert("Network Error", "Failed to fetch place details. Please check your internet connection.");
    } finally {
      setLoadingPredictions(false); // Stop loading place details
    }
  };

  // Markers for user, pickup, and destination
  const markers = [];

  if (userLocation) {
    markers.push({
      coordinates: { latitude: userLocation.latitude, longitude: userLocation.longitude },
      title: "Your Location",
      icon: () => <CustomCircleMarker color="blue" size={40} label="ME" />,
    });
  }

  if (pickupLocation) {
    markers.push({
      coordinates: { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
      title: "Pickup Location",
      icon: () => <CustomCircleMarker color="green" size={35} label="P" />,
    });
  }

  if (destination) {
    markers.push({
      coordinates: { latitude: destination.latitude, longitude: destination.longitude },
      title: "Destination",
      icon: () => <CustomCircleMarker color="red" size={35} label="D" />,
    });
  }

  // Polyline details for the calculated route
  const polylineDetails = routeCoordinate.length > 0 ? [
    {
      coordinates: routeCoordinate, // This is an array of coordinates
      color: "blue",
      geodesic: true,
      width: 5, // Adjusted width for visibility
    }
  ] : [];

  if (isLoadingLocation) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Getting your current location...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomAlertModal
        visible={showAlertModal}
        title={alertModalTitle}
        message={alertModalMessage}
        onClose={() => setShowAlertModal(false)}
      />
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowInputs(!showInputs)}
      >
        <Icon
          name={showInputs ? 'close' : 'search'}
          size={24}
          color="black"
        />
      </TouchableOpacity>
      {showInputs && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter Pickup Location"
            value={pickupAddressText}
            onChangeText={(text) => {
              setPickupAddressText(text);
              fetchPlacePredictions(text, 'pickup');
            }}
            onFocus={() => setShowPickupPredictions(true)}
            onBlur={() => setTimeout(() => setShowPickupPredictions(false), 100)} // Delay hiding to allow click
            autoCapitalize="words"
            placeholderTextColor="#888"
          />
          {showPickupPredictions && (pickupPredictions.length > 0 || loadingPredictions) && (
            <View style={styles.predictionsList}>
              {loadingPredictions && <ActivityIndicator size="small" color="#0000ff" style={styles.predictionLoadingIndicator} />}
              <FlatList
                data={pickupPredictions}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionItem}
                    onPress={() => handlePredictionSelect(item, 'pickup')}
                  >
                    <Text style={styles.predictionText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <TextInput
            style={styles.textInputDesitination}
            placeholder="Enter Destination"
            value={destinationAddressText}
            onChangeText={(text) => {
              setDestinationAddressText(text);
              fetchPlacePredictions(text, 'destination');
            }}
            onFocus={() => setShowDestinationPredictions(true)}
            onBlur={() => setTimeout(() => setShowDestinationPredictions(false), 100)} // Delay hiding to allow click
            autoCapitalize="words"
            placeholderTextColor="#888"
          />
          {showDestinationPredictions && (destinationPredictions.length > 0 || loadingPredictions) && (
            <View style={styles.predictionsList}>
              {loadingPredictions && <ActivityIndicator size="small" color="#0000ff" style={styles.predictionLoadingIndicator} />}
              <FlatList
                data={destinationPredictions}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionItem}
                    onPress={() => handlePredictionSelect(item, 'destination')}
                  >
                    <Text style={styles.predictionText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={handleGetRoute}
            disabled={loadingRoute}
          >
            {loadingRoute ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Get Route</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {hasLocationPermission ? (
        <GoogleMaps.View
          style={styles.map}
          uiSettings={{
            zoomControlsEnabled: false, // ✅ Disable zoom control buttons
            myLocationButtonEnabled: false, // Optional: Disable GPS button
            mapToolbarEnabled: false, // Optional: Disable toolbar on marker click
          }}
          markers={markers} 
          polylines={polylineDetails} 
          userLocation={{
            followUserLocation: true,
            coordinates: userLocation, 
          }}
          cameraPosition={initialRegion ? {
            coordinates: {
              latitude: initialRegion.latitude,
              longitude: initialRegion.longitude,
            },
            zoom: initialRegion.zoom || 15, 
          } : undefined}
        />
      ) : (
        <View style={styles.permissionDeniedContainer}>
          <Text style={styles.permissionDeniedText}>
            Location access is required to show your position on the map.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  floatingButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 25,
    zIndex: 150,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1, // Map takes remaining space
    width: '100%',
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  permissionDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
    color: '#333',
  },
  inputContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 100, // Ensure input container is above map
  },
  textInput: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginTop: 50,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textInputDesitination: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  markerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  modalButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  predictionsList: {
    position: 'absolute',
    // Adjust top based on textInput height and margin, and whether it's pickup or destination
    // For pickup, it's relative to the top of inputContainer + textInput's marginTop + textInput's height
    // For destination, it's relative to the top of inputContainer + textInputDesitination's marginBottom + textInputDesitination's height + pickup related elements
    // A more robust solution might involve `onLayout` for dynamic positioning or using a library that handles this.
    // For now, let's set a general top and rely on zIndex.
    top: 105, // This value works for the first input. For the second, it will overlap.
    left: 15,
    right: 15,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200, // Limit height of the dropdown
    zIndex: 200, // Ensure it's above other elements
    elevation: 4,
    paddingVertical: 5, // Add some padding inside the list
  },
  predictionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  predictionText: {
    fontSize: 16,
    color: '#333',
  },
  predictionLoadingIndicator: {
    paddingVertical: 10,
  },
});
