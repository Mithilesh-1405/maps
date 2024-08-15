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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInputValues({
            ...inputValues,
            [name]: value,
        });
    };
    const handleSearch = () => {
        console.log(inputValues)
        // geocodeLocation(inputValues.origin, "OrCH8o2aDx0mJkv0PzgSLiPMzMAgNqyhblmHWFSa", uuidv4());
        geocodeLocation(inputValues.destination, "OrCH8o2aDx0mJkv0PzgSLiPMzMAgNqyhblmHWFSa", uuidv4());

    };

    const geocodeLocation = async (location, apiKey, requestId) => {

        const bounds = '12.910000,77.610000|12.900000,77.600000';
        const language = 'hi';

        const url = `https://api.olamaps.io/places/v1/geocode?address=${location}&language=${language}&api_key=${apiKey}`;


        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Request-Id': requestId,
            },
        });

        if (!response.ok) {
            console.error(
                "Failed to fetch coordinates:",
                response.status,
                response.statusText
            );
        }

        else {
            const data = await response.json();

            // Ensure geocodingResults exists and has at least one result
            if (data.geocodingResults && data.geocodingResults.length > 0) {
                const lat = data.geocodingResults[0].geometry.location.lat;
                const lng = data.geocodingResults[0].geometry.location.lng;

                if (location === inputValues.origin) {
                    setOrigin([lat, lng]);
                } else {
                    setDestination([lat, lng]);
                }

                console.log("Origin:", origin);
                console.log("Destination:", Destination);
            } else {
                console.error("No geocoding results found for location:", location);
            }
        }
    }

    const fetchRoute = async () => {
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
                setString(data.routes[0].overview_polyline);
                setDecodedPolyline(polyline.decode(polylineString));

            }
        } else {
            console.error(
                "Failed to fetch route:",
                response.status,
                response.statusText
            );
        }
    };

    // useEffect(() => {
    //     fetchRoute();
    // }, [fetchRoute]);

    useEffect(() => {
        if (latlngs.length === 0) {
            setCoordsStatus("true")
            return;
        }

        const carIcon = L.icon({
            iconUrl: car,
            iconSize: [55, 50],
            iconAnchor: [25, 20],
            popupAnchor: [-3, -76],
        });

        if (!mapRef.current) {
            mapRef.current = L.map("map").setView([15.345640000000001, 75.11655], 15);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);

            markerRef.current = L.marker([15.345640000000001, 75.11655], { icon: carIcon }).addTo(
                mapRef.current
            );

            //   polylineRef.current = L.polyline([latlngs[0]], { color: "blue" }).addTo(
            //     mapRef.current
            //   );
        }

        // let index = 0;
        // const moveMarker = () => {
        //     if (index < latlngs.length - 1) {
        //         index++;
        //         const nextLatLng = latlngs[index];
        //         markerRef.current.setLatLng(nextLatLng);
        //         polylineRef.current.addLatLng(nextLatLng);
        //         mapRef.current.panTo(nextLatLng);
        //     }
        // };

        // const interval = setInterval(moveMarker, 200);

        return () => {
            //   clearInterval(interval);
            //   if (mapRef.current) {
            //     mapRef.current.remove();
            //     mapRef.current = null;
            //   }
        };
    });

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
