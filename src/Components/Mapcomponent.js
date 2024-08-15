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
    const [coordsLoaded, setCoordsStatus] = useState("false")
    const [shouldFetchRoute, setShouldFetchRoute] = useState(false);
    const DEFAULT_LOCATION = [15.36457598719019, 75.10291078571753];
    const DEFAULT_ZOOM = 13;
    const handleChange = (e) => {
        const { name, value } = e.target;
        setInputValues({
            ...inputValues,
            [name]: value,
        });
    };
    const handleSearch = async () => {
        console.log(inputValues);
        const originCoords = await geocodeLocation(inputValues.origin, "OrCH8o2aDx0mJkv0PzgSLiPMzMAgNqyhblmHWFSa", uuidv4());
        const destCoords = await geocodeLocation(inputValues.destination, "OrCH8o2aDx0mJkv0PzgSLiPMzMAgNqyhblmHWFSa", uuidv4());

        if (originCoords && destCoords) {
            setOrigin(originCoords);
            setDestination(destCoords);
            setShouldFetchRoute(true);
        } else {
            console.error("Failed to geocode one or both locations");
        }
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
                <input
                    type="text"
                    name="origin"
                    placeholder="Origin"
                    autoComplete="off"
                    onChange={handleChange}
                />
                <input
                    type="text"
                    name="destination"
                    autoComplete="off"
                    placeholder=" Destination"
                    onChange={handleChange}
                />
                <button onClick={handleSearch}>Search</button>
            </div>
        </div>
    );
};

export default MapComponent;
