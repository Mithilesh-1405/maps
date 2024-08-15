import React, { useEffect, useRef, useState } from "react";
import "../App.css";
import L from "leaflet";
import car from "../../src/images/car.png";
import { v4 as uuidv4 } from "uuid";
import polyline from "polyline";

const MapComponent = () => {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const polylineRef = useRef(null);
    const [polylineString, setString] = useState("");
    const [latlngs, setDecodedPolyline] = useState([]);
    const [inputValues, setInputValues] = useState({});
    const [origin, setOrigin] = useState([]);
    const [Destination, setDestination] = useState([]);
    const [coordsLoaded, setCoordsStatus] = useState("false");
    const [shouldFetchRoute, setShouldFetchRoute] = useState(false);
    const [originSuggestions, setOriginSuggestions] = useState([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);
    const DEFAULT_LOCATION = [15.36457598719019, 75.10291078571753];
    const DEFAULT_ZOOM = 13;
    const [displayName, setDisplayName] = useState({})

    const fetchSuggestions = async (input, isOrigin) => {
        console.log("inside suggestions")
        const apiKey = "OrCH8o2aDx0mJkv0PzgSLiPMzMAgNqyhblmHWFSa";
        const requestId = uuidv4();

        try {
            const response = await fetch(
                `https://api.olamaps.io/places/v1/autocomplete?input=${input}&api_key=${apiKey}`,
                {
                    headers: {
                        'X-Request-Id': requestId,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(data)
            if (isOrigin) {
                // console.log(originSuggestions)
                setOriginSuggestions(data.predictions || []);
            } else {
                setDestinationSuggestions(data.predictions || []);
            }
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInputValues({
            ...inputValues,
            [name]: value,
        });
        setDisplayName({
            ...displayName,
            [name]: value
        })
        if (value.length > 2) {
            fetchSuggestions(value, name === "origin");
        } else {
            if (name === "origin") {
                setOriginSuggestions([]);
            } else {
                setDestinationSuggestions([]);
            }
        }
    };

    const handleSuggestionSelect = (suggestion, suggestionClicked, isOrigin) => {
        if (isOrigin) {
            setInputValues({
                ...inputValues,
                origin: [suggestion.lat, suggestion.lng],
            });
            setDisplayName({
                ...displayName,
                origin: suggestionClicked
            })
            setOriginSuggestions([]);
        } else {
            setInputValues({
                ...inputValues,
                destination: [suggestion.lat, suggestion.lng],
            });
            setDisplayName({
                ...displayName,
                destination: suggestionClicked
            })
            setDestinationSuggestions([]);
        }
    };

    const handleSearch = async () => {
        setOrigin(inputValues.origin);
        setDestination(inputValues.destination);
        setShouldFetchRoute(true);

    };

    const geocodeLocation = async (location, apiKey, requestId) => {
        const url = `https://api.olamaps.io/places/v1/geocode?address=${location}&language=hi&api_key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Request-Id': requestId,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch coordinates: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.geocodingResults && data.geocodingResults.length > 0) {
                const lat = data.geocodingResults[0].geometry.location.lat;
                const lng = data.geocodingResults[0].geometry.location.lng;
                return [lat, lng];
            } else {
                throw new Error("No geocoding results found for location: " + location);
            }
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    const fetchRoute = async () => {
        console.log("inside fetch route");
        const apiKey = "OrCH8o2aDx0mJkv0PzgSLiPMzMAgNqyhblmHWFSa";
        const requestId = uuidv4();

        const response = await fetch(
            `https://api.olamaps.io/routing/v1/directions?origin=${origin}&destination=${Destination}&api_key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "X-Request-Id": requestId,
                },
            }
        );
        if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes[0]) {
                const newPolylineString = data.routes[0].overview_polyline;
                setString(newPolylineString);
                const newLatLngs = polyline.decode(newPolylineString);
                setDecodedPolyline(newLatLngs);
            }
        } else {
            console.error(
                "Failed to fetch route:",
                response.status,
                response.statusText
            );
        }
    };

    useEffect(() => {
        if (shouldFetchRoute && origin.length > 0 && Destination.length > 0) {
            fetchRoute();
            setShouldFetchRoute(false);
        }
    }, [shouldFetchRoute, origin, Destination]);

    useEffect(() => {
        if (latlngs.length === 0) {
            setCoordsStatus("true");
            return;
        }

        const carIcon = L.icon({
            iconUrl: car,
            iconSize: [55, 50],
            iconAnchor: [25, 20],
            popupAnchor: [-3, -76],
        });

        if (markerRef.current) {
            markerRef.current.remove();
        }
        if (polylineRef.current) {
            polylineRef.current.remove();
        }

        mapRef.current.setView(latlngs[0], 15);

        markerRef.current = L.marker(latlngs[0], { icon: carIcon }).addTo(mapRef.current);
        polylineRef.current = L.polyline([latlngs[0]], { color: "blue" }).addTo(mapRef.current);

        let index = 0;
        const moveMarker = () => {
            if (index < latlngs.length - 1) {
                index++;
                const nextLatLng = latlngs[index];
                markerRef.current.setLatLng(nextLatLng);
                polylineRef.current.addLatLng(nextLatLng);
                mapRef.current.panTo(nextLatLng);
            }
        };

        const interval = setInterval(moveMarker, 1);

        return () => {
            clearInterval(interval);
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
            }
            if (polylineRef.current) {
                polylineRef.current.remove();
                polylineRef.current = null;
            }
        };
    }, [latlngs]);

    useEffect(() => {
        if (!mapRef.current) {
            mapRef.current = L.map("map").setView(DEFAULT_LOCATION, DEFAULT_ZOOM);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    return (
        <div>
            <div id="map" style={{ height: "100vh", width: "100%", zIndex: 0 }}></div>
            <div className="inputParams">
                <div className="input-container">
                    <input
                        type="text"
                        name="origin"
                        placeholder="Origin"
                        autoComplete="off"
                        onChange={handleChange}
                        value={displayName.origin || ''}
                    />
                    {originSuggestions.length > 0 && (
                        <ul className="suggestions">
                            {originSuggestions.map((suggestion, index) => (
                                <li key={index} onClick={() => handleSuggestionSelect(suggestion.geometry.location, suggestion.description, true)}>
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
                        value={displayName.destination || ''}
                    />
                    {destinationSuggestions.length > 0 && (
                        <ul className="suggestions">
                            {destinationSuggestions.map((suggestion, index) => (
                                <li key={index} onClick={() => handleSuggestionSelect(suggestion.geometry.location, suggestion.description, false)}>
                                    {suggestion.description}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <button onClick={handleSearch}>Search</button>
            </div>
        </div>
    );
};

export default MapComponent;