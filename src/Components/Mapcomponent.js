import React, { useEffect, useRef, useState } from "react";
import "../App.css";
import L from "leaflet";
import car from "../../src/images/car.png";
import { v4 as uuidv4 } from "uuid";
import polyline from "polyline";

const MapComponent = () => {
    // Map and route related refs and state
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const polylineRef = useRef(null);
    const intervalRef = useRef(null);
    const currentIndexRef = useRef(0);
    const [latlngs, setDecodedPolyline] = useState([]);
    const [routeDistance, setRouteDistance] = useState('');

    // Input and location state
    const [inputValues, setInputValues] = useState({});
    const [origin, setOrigin] = useState([]);
    const [destination, setDestination] = useState([]);
    const [displayName, setDisplayName] = useState({});
    const [DEFAULT_LOCATION, setInitLocation] = useState([12.973457468956516, 77.59245700264772]);

    // Control flags
    const [shouldFetchRoute, setShouldFetchRoute] = useState(false);
    const [showCancelButton, setShowCancelButton] = useState(false);
    const [showStartButton, setShowStartButton] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [sliderValue, setSliderValue] = useState(1);

    // Autocomplete suggestions
    const [originSuggestions, setOriginSuggestions] = useState([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);

    // Constants
    const DEFAULT_ZOOM = 13;
    const [apiKey, setApiKey] = useState('');

    //Gets the api key from env file when the app loads
    useEffect(() => {
        setApiKey(process.env.REACT_APP_API_KEY);
    }, []);


    //The slider time is set based on the slider value
    const getIntervalTime = (value) => {
        switch (value) {
            case 1: return 10;
            case 2: return 50;
            case 3: return 100;
            case 4: return 200;
            case 5: return 300;
            default: return 100;
        }
    };


    //This function fetches all the suggestion when a user types in the origin and destination input field
    const fetchSuggestions = async (input, isOrigin) => {
        const requestId = uuidv4();
        try {
            const response = await fetch(
                `https://api.olamaps.io/places/v1/autocomplete?input=${input}&api_key=${apiKey}`,
                {
                    headers: { "X-Request-Id": requestId },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const suggestions = data.predictions || [];

            isOrigin ? setOriginSuggestions(suggestions) : setDestinationSuggestions(suggestions);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    };


    //This function handles the change in the input fields
    const handleChange = (e) => {
        const { name, value } = e.target;
        setInputValues(prev => ({ ...prev, [name]: value }));
        setDisplayName(prev => ({ ...prev, [name]: value }));

        if (value.length > 2) {
            fetchSuggestions(value, name === "origin");
        } else {
            name === "origin" ? setOriginSuggestions([]) : setDestinationSuggestions([]);
        }
    };

    //This function handles the suggestion clicked by user and sets them to origin and destination
    const handleSuggestionSelect = (suggestion, suggestionClicked, isOrigin) => {
        const newInputValues = {
            ...inputValues,
            [isOrigin ? "origin" : "destination"]: [suggestion.lat, suggestion.lng],
        };
        setInputValues(newInputValues);

        const newDisplayName = {
            ...displayName,
            [isOrigin ? "origin" : "destination"]: suggestionClicked,
        };
        setDisplayName(newDisplayName);

        isOrigin ? setOriginSuggestions([]) : setDestinationSuggestions([]);
    };


    //This function updates the map view
    const updateMapView = (latitude, longitude) => {
        if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], DEFAULT_ZOOM);
        }
    };


    //Gets the current location of the user

    const GetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLocation = [position.coords.latitude, position.coords.longitude];
                    setInitLocation(newLocation);
                    updateMapView(newLocation[0], newLocation[1]);
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
        }
    };

    //Handles the logic when user clicks search
    //Basically sets the origin and destination values(latitude and longitude) and sets the shouldFetchRoute flag to true, so that the useEffect will fetch the route
    const handleSearch = () => {
        if (inputValues.origin && inputValues.destination) {
            setOrigin(inputValues.origin);
            setDestination(inputValues.destination);
            setShouldFetchRoute(true);
            setShowStartButton(true);
            setShowCancelButton(true);
        } else {
            alert("Please enter both origin and destination!");
        }
    };

    //when user clicks start, the car moving animation starts, and it shows the cancel button, hence allowing user to cancel the moving animation and redirect to origin
    const handleStart = () => {
        setIsMoving(true);
        setShowCancelButton(true);
    };


    //when user clicks cancel, the car stops moving, and it shows the start button, hence allowing user to start the moving animation again
    const handleCancel = () => {
        setIsMoving(false);
        setShowStartButton(true);
        if (markerRef.current && latlngs.length > 0) {
            markerRef.current.setLatLng(latlngs[0]);
            mapRef.current.setView(latlngs[0], 15);
        }
        currentIndexRef.current = 0;
        if (intervalRef.current) clearInterval(intervalRef.current);
    };


    //This function fetches the route by calling the olamaps directions api and gets all the latitude and longitudes from origin to destination
    const fetchRoute = async () => {
        const requestId = uuidv4();

        try {
            const response = await fetch(
                `https://api.olamaps.io/routing/v1/directions?origin=${origin}&destination=${destination}&api_key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "X-Request-Id": requestId },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch route: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.routes && data.routes[0]) {
                const newPolylineString = data.routes[0].overview_polyline;
                setRouteDistance(data.routes[0].legs[0].distance);

                //From the response of the directions api, we get the polyline string, which is basically encoded string of latitudes and longitudes
                const newLatLngs = polyline.decode(newPolylineString);

                //we then decode that string to get the latitudes and longitudes from origin to destination
                setDecodedPolyline(newLatLngs);
            }
        } catch (error) {
            console.error("Error fetching route:", error);
        }
    };


    //Validation check to see if user has entered both origin and destination
    useEffect(() => {
        if (shouldFetchRoute && origin?.length > 0 && destination?.length > 0) {
            fetchRoute();
            setShouldFetchRoute(false);
        }
    }, [shouldFetchRoute, origin, destination]);


    //This useEffect is responsible for moving the marker and polyline on the map when the user clicks start after setting origin and destination
    useEffect(() => {
        if (latlngs.length === 0) {
            return;
        }

        const carIcon = L.icon({
            iconUrl: car,
            iconSize: [55, 50],
            iconAnchor: [25, 20],
            popupAnchor: [-3, -76],
        });

        if (!markerRef.current && mapRef.current) {
            markerRef.current = L.marker(latlngs[0], { icon: carIcon }).addTo(mapRef.current);
            polylineRef.current = L.polyline(latlngs, { color: "blue" }).addTo(mapRef.current);
            mapRef.current.setView(latlngs[0], 15);
        }

        //Moves the marker dynamically after certain ms(milliseconds) which is set by the slider on the main page
        const moveMarker = () => {
            if (currentIndexRef.current < latlngs.length - 1 && isMoving && markerRef.current) {
                currentIndexRef.current++;
                const nextLatLng = latlngs[currentIndexRef.current];
                markerRef.current.setLatLng(nextLatLng);
                mapRef.current.panTo(nextLatLng);
            }
        };

        //Sets the interval time for the slider on the main page
        const startInterval = () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(moveMarker, getIntervalTime(sliderValue));
        };

        if (isMoving) {
            startInterval();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [latlngs, isMoving, sliderValue]);

    //This useEffect is responsible for setting up the initial map when the app is loaded, by setting the default location and zoom
    //It also gets the current location of the user
    useEffect(() => {
        if (!mapRef.current) {
            if (DEFAULT_LOCATION && DEFAULT_LOCATION.length === 2) {
                mapRef.current = L.map("map").setView(DEFAULT_LOCATION, DEFAULT_ZOOM);
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                }).addTo(mapRef.current);

                GetLocation();
            } else {
                console.error('Invalid DEFAULT_LOCATION for initial map setup:', DEFAULT_LOCATION);
            }
        }
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);


    //This function resets the values from origin and destination fields, so when a user wants to clear what they typed, they can click the reset button and enter the new origin and destination
    const handleReset = () => {
        // Clear input values
        setInputValues({});
        setDisplayName({});
        setOrigin([]);
        setDestination([]);
        setShouldFetchRoute(false);
        setShowStartButton(false);
        setShowCancelButton(false);
        setIsMoving(false);
        setOriginSuggestions([]);
        setDestinationSuggestions([]);
        setRouteDistance('');

        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }

        if (polylineRef.current) {
            polylineRef.current.remove();
            polylineRef.current = null;
        }

        if (mapRef.current && DEFAULT_LOCATION && DEFAULT_LOCATION.length === 2) {
            mapRef.current.setView(DEFAULT_LOCATION, DEFAULT_ZOOM);
        } else {
            console.error('Invalid DEFAULT_LOCATION:', DEFAULT_LOCATION);
        }

        if (intervalRef.current) clearInterval(intervalRef.current);
        currentIndexRef.current = 0;

        setDecodedPolyline([]);
    };


    return (
        <div className="container">
            <div id="map" style={{ height: "100vh", width: "100%", zIndex: 0 }}></div>
            <div className="inputParams">
                <div className="input-container">
                    <input
                        type="text"
                        name="origin"
                        placeholder="Origin"
                        autoComplete="off"
                        onChange={handleChange}
                        value={displayName.origin || ""}
                    />
                    {originSuggestions.length > 0 && (
                        <ul className="suggestions">
                            {originSuggestions.map((suggestion, index) => (
                                <li
                                    key={index}
                                    onClick={() => handleSuggestionSelect(
                                        suggestion.geometry.location,
                                        suggestion.description,
                                        true
                                    )}
                                >
                                    {suggestion.description}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="input-container">
                    <input
                        type="text"
                        name="destination"
                        autoComplete="off"
                        placeholder="Destination"
                        onChange={handleChange}
                        value={displayName.destination || ""}
                    />
                    {destinationSuggestions.length > 0 && (
                        <ul className="suggestions">
                            {destinationSuggestions.map((suggestion, index) => (
                                <li
                                    key={index}
                                    onClick={() => handleSuggestionSelect(
                                        suggestion.geometry.location,
                                        suggestion.description,
                                        false
                                    )}
                                >
                                    {suggestion.description}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="btns">
                    <button onClick={handleSearch}>Search</button>
                    {latlngs.length > 0 && (
                        <>
                            {showStartButton && (
                                <button className="start" onClick={handleStart}>Start</button>
                            )}
                            {showCancelButton && (
                                <>
                                    <button className="cancel" onClick={handleCancel}>Cancel</button>
                                    <button className="reset" onClick={handleReset}>Reset</button>
                                </>
                            )}
                        </>
                    )}
                </div>
                {latlngs.length > 0 && routeDistance && (
                    <div className="distance">
                        <p>Distance: <span className="routeDist">{routeDistance / 1000} km</span></p>
                    </div>
                )}
            </div>
            <div className="slider-container">
                <input
                    type="range"
                    min="1"
                    max="5"
                    value={sliderValue}
                    onChange={(e) => {
                        const newValue = parseInt(e.target.value);
                        setSliderValue(newValue);
                        if (isMoving && intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = setInterval(() => {
                                if (currentIndexRef.current < latlngs.length - 1 && isMoving && markerRef.current) {
                                    currentIndexRef.current++;
                                    const nextLatLng = latlngs[currentIndexRef.current];
                                    markerRef.current.setLatLng(nextLatLng);
                                    mapRef.current.panTo(nextLatLng);
                                }
                            }, getIntervalTime(newValue));
                        }
                    }}
                    className="slider"
                />
                <span style={{ color: 'white', fontWeight: 'bold', width: '100%' }}>Speed: {6 - sliderValue}</span>
            </div>
            <button
                className="relocate-button"
                onClick={GetLocation}
                style={{
                    position: 'absolute',
                    bottom: '50px',
                    right: '20px',
                    zIndex: 1000
                }}
            >
                My location
            </button>
            <div>
                Hello
            </div>
        </div>

    );
};

export default MapComponent;