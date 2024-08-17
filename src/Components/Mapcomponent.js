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
    const [latlngs, setDecodedPolyline] = useState([]);
    const [routeDistance, setRouteDistance] = useState('')
    // Input and location state
    const [inputValues, setInputValues] = useState({});
    const [origin, setOrigin] = useState([]);
    const [destination, setDestination] = useState([]);
    const [displayName, setDisplayName] = useState({});
    const [DEFAULT_LOCATION, setInitLocation] = useState([15.36457598719019, 75.10291078571753]);


    // Control flags
    const [shouldFetchRoute, setShouldFetchRoute] = useState(false);
    const [showCancelButton, setShowCancelButton] = useState(false);
    const [showStartButton, setShowStartButton] = useState(false);
    const [isMoving, setIsMoving] = useState(false);

    // Autocomplete suggestions
    const [originSuggestions, setOriginSuggestions] = useState([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);

    // Constants
    // const DEFAULT_LOCATION = [15.36457598719019, 75.10291078571753];
    const DEFAULT_ZOOM = 13;
    // Fetch location suggestions for autocomplete
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        setApiKey(process.env.REACT_APP_API_KEY);
    }, []);
    const fetchSuggestions = async (input, isOrigin) => {
        const requestId = uuidv4();
        console.log(apiKey)
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

    // Handle input change for origin and destination
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

    // Handle selection of a suggestion
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


    const updateMapView = (latitude, longitude) => {
        if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], DEFAULT_ZOOM);
        }
    };
    const GetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                    setInitLocation(newLocation);
                    updateMapView(newLocation.latitude, newLocation.longitude);
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
        }
    };

    // Initiate route search
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
    const handleStart = () => {
        setIsMoving(true);
        setShowCancelButton(true);
    };
    const handleCancel = () => {
        if (markerRef.current && latlngs.length > 0) {
            markerRef.current.setLatLng(latlngs[0]);
            mapRef.current.setView(latlngs[0], 15);
        }

        setIsMoving(false);
        setShowStartButton(true);
    };
    // Fetch route data from API
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
                setRouteDistance(data.routes[0].legs[0].distance)
                const newLatLngs = polyline.decode(newPolylineString);
                setDecodedPolyline(newLatLngs);
            }
        } catch (error) {
            console.error("Error fetching route:", error);
        }
    };

    // Effect to fetch route when search is initiated
    useEffect(() => {
        if (shouldFetchRoute && origin?.length > 0 && destination?.length > 0) {
            fetchRoute();
            setShouldFetchRoute(false);
        }
    }, [shouldFetchRoute, origin, destination]);

    // Effect to update map with new route data
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

        // Remove existing marker and polyline
        if (markerRef.current) markerRef.current.remove();
        if (polylineRef.current) polylineRef.current.remove();

        // Set view to start of route
        mapRef.current.setView(latlngs[0], 15);

        // Add new marker and polyline
        markerRef.current = L.marker(latlngs[0], { icon: carIcon }).addTo(mapRef.current);
        polylineRef.current = L.polyline(latlngs, { color: "blue" }).addTo(mapRef.current);

        let index = 0;
        const moveMarker = () => {
            if (index < latlngs.length - 1 && isMoving) {
                index++;
                const nextLatLng = latlngs[index];
                markerRef.current.setLatLng(nextLatLng);
                mapRef.current.panTo(nextLatLng);
            }
        };

        const interval = setInterval(moveMarker, 100);

        return () => {
            clearInterval(interval);
        };
    }, [latlngs, isMoving]);

    // Effect to initialize map
    useEffect(() => {
        if (!mapRef.current) {
            mapRef.current = L.map("map").setView(DEFAULT_LOCATION, DEFAULT_ZOOM);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);
    useEffect(() => {
        if (!mapRef.current) {
            mapRef.current = L.map("map").setView([DEFAULT_LOCATION, DEFAULT_ZOOM]);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);

            // Call GetLocation to set initial location
            GetLocation();
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);
    const handleReset = () => {
        // Clear input values and display names
        setInputValues({});
        setDisplayName({});

        // Clear origin and destination
        setOrigin([]);
        setDestination([]);

        // Clear route
        setDecodedPolyline([]);

        // Reset control flags
        setShouldFetchRoute(false);
        setShowStartButton(false);
        setShowCancelButton(false);
        setIsMoving(false);

        // Clear suggestions
        setOriginSuggestions([]);
        setDestinationSuggestions([]);

        if (markerRef.current) markerRef.current.remove();
        if (polylineRef.current) polylineRef.current.remove();

        if (mapRef.current) {
            mapRef.current.setView(DEFAULT_LOCATION, DEFAULT_ZOOM);
        }
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
            <button
                className="relocate-button"
                onClick={GetLocation}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 1000
                }}
            >
                My location
            </button>
        </div>
    );
};

export default MapComponent;