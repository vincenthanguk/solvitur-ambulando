'use strict';

const form = document.querySelector('.form');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputThoughts = document.querySelector('.form__input--thoughts');
const walksList = document.querySelector('.walks');

// prettier-ignore
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

class Walk {
  date = new Date();
  id = Date.now() + ''.slice(-10);
  description;

  constructor(type, coords, distance, duration, thoughts, description) {
    this.type = type; //string
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
    this.thoughts = thoughts; //string
    this.description = description;
    this._setDescription();
  }

  _setDescription() {
    this.description = `${this.type ? this.type : 'Walk'} on ${
      months[this.date.getMonth()]
    } ${this.date.getDay()}`;
    console.log(this.description);
  }
}

class App {
  #map;
  #mapEvent;
  #walks = [];

  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWalk.bind(this));
    this._getLocalStorage();
    walksList.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('walk'));
    console.log(data);

    if (!data) return;

    this.#walks = data;
    this.#walks.forEach(walk => this._renderWorkout(walk));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          console.error('Position could not be retrieved');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    console.log(this);
    this.#map = L.map('mapid').setView(coords, 14);
    console.log(this.#map);

    L.tileLayer(
      'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken:
          'pk.eyJ1IjoidmluY2VudGhhbmd1ayIsImEiOiJja24zbTgwamowYWVzMnZvMDZuZmRmdHI5In0.ZTgoo-P85rRrljnmO6WjmQ',
      }
    ).addTo(this.#map);
    // Circle indicating current location
    L.circle(coords, {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.2,
      radius: 50,
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#walks.forEach(walk => this._renderWorkoutMarker(walk));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _newWalk(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const thoughts = inputThoughts.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let walk;

    if (!validInputs(distance, duration) || !allPositive(distance, duration))
      return alert('Input must be a positive Number!');

    // create walk object
    walk = new Walk(type, [lat, lng], distance, duration, thoughts);

    // Add new object to walks array
    this.#walks.push(walk);
    console.log(this.#walks);

    // render workout on map as marker
    this._renderWorkoutMarker(walk);

    // render walk on menu
    this._renderWorkout(walk);
    //   Clear inputs
    inputDistance.value = inputDuration.value = inputThoughts.value = '';

    // hide form
    this._hideForm();

    // save to local storage
    localStorage.setItem('walk', JSON.stringify(this.#walks));
  }

  // _setLocalStorage() {}

  _renderWorkout(walk) {
    // insert markup into html
    const html = `
      <li class="walk" data-id="${walk.id}">
              <h2 class="walk-title">${walk.description}</h2>
              <div class="walk__container">
              <div class="walk__details">
                <span class="walk__icon">📐</span>
                <span class="walk__value">${walk.distance}</span>
                <span class="walk__unit">km</span>
              </div>
                 <div class="walk__details">
                <span class="walk__icon">🥾</span>
                <span class="walk__value">100</span>
                <span class="walk__unit">Steps</span>
              </div>
              <div class="walk__details">
                <span class="walk__icon">⏱</span>
                <span class="walk__value">${walk.duration}</span>
                <span class="walk__unit">min</span>
              </div>
              </div>
              <div class="walk__details">
                <span class="walk__thoughts">Thoughts: <i>"${walk.thoughts}"</i></span>
              </div>
            </li>`;

    walksList.insertAdjacentHTML('afterbegin', html);
  }

  _renderWorkoutMarker(walk) {
    L.marker(walk.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: 'running-popup',
        })
      )
      .setPopupContent(`${walk.description}<br><i>"${walk.thoughts}</i>"`)
      .openPopup();
  }

  _hideForm() {
    form.classList.add('hidden');
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.walk');
    if (!workoutEl) return;

    const workout = this.#walks.find(work => work.id === workoutEl.dataset.id);
    console.log(workoutEl);
    console.log(workout);
    this.#map.setView(workout.coords);
  }
}

const app = new App();

// retrieve  geolocation coordinates & initite map

// /////////////////////////////////////////////////////////////////////////////////
