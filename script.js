'use strict';

require('dotenv').config();

const form = document.querySelector('.form');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputThoughts = document.querySelector('.form__input--thoughts');
const walksList = document.querySelector('.walks');
const helpBtn = document.querySelector('.help');
const closeModalBtn = document.querySelector('.btn__close-modal');
const overlay = document.querySelector('.overlay');
const modal = document.querySelector('.modal');

const stepCounter = document.querySelector('.stepcounter');

// prettier-ignore
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

class Walk {
  date = new Date();
  id = Date.now() + ''.slice(-10);
  steps;
  description;
  day = this.date.getDate();
  month = this.date.getMonth();
  year = this.date.getYear();

  constructor(type, coords, distance, duration, thoughts) {
    this.type = type; //string
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
    this.thoughts = thoughts; //string
    this._setDescription();
    this._calculateSteps(this.distance);
  }
  _compareDate(day, month, year) {
    const curDate = new Date();
    const curDay = curDate.getDate();
    const curMonth = curDate.getMonth();
    const curYear = curDate.getYear();
    if (day === curDay && month === curMonth && year === curYear)
      return 'Today';
    if (day === curDay - 1 && month === curMonth && year === curYear)
      return 'Yesterday';
  }

  _setDescription() {
    const compareResult = this._compareDate(this.day, this.month, this.year);

    if (compareResult === 'Today' || compareResult === 'Yesterday') {
      this.description = `${compareResult}'s ${
        this.type !== 'default' ? this.type : 'Walk'
      }`;
    } else {
      this.description = `${this.type !== 'default' ? this.type : 'Walk'} on ${
        months[this.month]
      } ${this.day}${compareResult ? compareResult : ''}`;
    }
  }

  _calculateSteps(distance) {
    this.steps = +distance * 1312;
  }
}

class App {
  #map;
  #mapEvent;
  #markers = [];
  #walks = [];
  #totalSteps = 0;

  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWalk.bind(this));
    this._getLocalStorage();
    // event handlers
    walksList.addEventListener('click', this._deleteWalk.bind(this));
    walksList.addEventListener('click', this._moveToPopup.bind(this));
    helpBtn.addEventListener('click', this._openModal.bind(this));
    closeModalBtn.addEventListener('click', this._closeModal.bind(this));
    overlay.addEventListener('click', this._closeModal.bind(this));
    document.addEventListener('keydown', this._closeModalDocument.bind(this));
  }

  _getLocalStorage() {
    let data = [];
    for (let i = 0; i < localStorage.length; i++) {
      data.push(JSON.parse(localStorage.getItem(localStorage.key(i))));
    }
    if (!data) return;

    this.#walks = data;
    this.#walks.forEach(walk => {
      this._updateDescription(walk);
      this._renderWalk(walk);
    });

    this._calculateTotalSteps();
    this._renderSteps();
  }
  _updateDescription(walk) {
    const compareResult = this._compareDate(walk.day, walk.month, walk.year);

    if (compareResult === 'Today' || compareResult === 'Yesterday') {
      walk.description = `${compareResult}'s ${
        walk.type !== 'default' ? walk.type : 'Walk'
      }`;
    } else {
      walk.description = `${walk.type !== 'default' ? walk.type : 'Walk'} on ${
        months[walk.month]
      } ${walk.day}${compareResult ? compareResult : ''}`;
    }
  }

  _compareDate(day, month, year) {
    const curDate = new Date();
    const curDay = curDate.getDate();
    const curMonth = curDate.getMonth();
    const curYear = curDate.getYear();
    if (day === curDay && month === curMonth && year === curYear)
      return 'Today';
    if (day === curDay - 1 && month === curMonth && year === curYear)
      return 'Yesterday';
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

    const API_KEY = process.env.API_KEY;
    this.#map = L.map('mapid').setView(coords, 14);

    L.tileLayer(
      'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: API_KEY,
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
    this.#walks.forEach(walk => this._renderWalkMarker(walk));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _resetSelectEl(selectEl, value) {
    for (let i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === value)
        selectEl.options[i].selected = true;
    }
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
    let walkID;

    if (!validInputs(distance, duration) || !allPositive(distance, duration))
      return alert('Input must be a positive Number!');

    // create walk object
    walk = new Walk(type, [lat, lng], distance, duration, thoughts);
    walkID = walk.id;
    // Add new object to walks array
    this.#walks.push(walk);

    // render walk on map as marker
    this._renderWalkMarker(walk);

    // render walk on menu
    this._renderWalk(walk);

    this._calculateTotalSteps();
    this._renderSteps();

    //   Clear inputs
    inputDistance.value = inputDuration.value = inputThoughts.value = '';

    // hide form
    this._hideForm();

    // put select menu to default
    this._resetSelectEl(inputType, 'default');

    // save to local storage
    localStorage.setItem(
      walkID,
      JSON.stringify(this.#walks[this.#walks.length - 1])
    );
  }

  _renderWalk(walk) {
    const id = walk.id;
    // insert markup into html
    const html = `
      <li class="walk" data-id="${id}">
              <h2 class="walk-title">${walk.description}</h2>
              <div class="walk__container">
              <div class="walk__details">
                <span class="walk__icon">📐</span>
                <span class="walk__value">${walk.distance}</span>
                <span class="walk__unit">km</span>
              </div>
                 <div class="walk__details">
                <span class="walk__icon">🥾</span>
                <span class="walk__value">${walk.steps}</span>
                <span class="walk__unit">Steps</span>
              </div>
              <div class="walk__details">
                <span class="walk__icon">⏱</span>
                <span class="walk__value">${walk.duration}</span>
                <span class="walk__unit">min</span>
              </div>
              <div class="walk__details delete__walk" data-id="${id}">❌</div>
              </div>
              </div>
             ${
               walk.thoughts
                 ? `<div class="walk__details">
                <span class="walk__thoughts">Thoughts: <i>"${walk.thoughts}"</i></span>
              </div>`
                 : ''
             }
            </li>`;

    walksList.insertAdjacentHTML('afterbegin', html);
  }

  _renderSteps() {
    const steps = this.#totalSteps;
    // clear content
    stepCounter.innerHTML = '';
    // markup
    const html = `Total Steps: ${steps}`;

    stepCounter.insertAdjacentText('afterbegin', html);
  }

  _calculateTotalSteps() {
    this.#totalSteps = 0;
    this.#walks.forEach(walk => (this.#totalSteps += walk.steps));
  }

  _renderWalkMarker(walk) {
    let marker;

    marker = L.marker(walk.coords)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: 'popup',
        })
      )
      .setPopupContent(
        `${walk.description}${
          walk.thoughts ? `<br><i>"${walk.thoughts}</i>"` : ''
        }`
      );

    this.#map.addLayer(marker);
    marker.openPopup();
    this.#markers.push(marker);
  }

  _clearMarkers() {
    const new_markers = [];
    this.#markers.forEach(marker => this.#map.removeLayer(marker));
    this.#markers = new_markers;
  }

  _hideForm() {
    form.classList.add('hidden');
  }

  _moveToPopup(e) {
    const walkEl = e.target.closest('.walk');
    console.log(e.target);
    if (!walkEl) return;
    const walk = this.#walks.find(walk => walk.id === walkEl.dataset.id);
    // prevents screen from moving after walk is deleted
    if (!walk) return;
    this.#map.setView(walk.coords);
  }

  _deleteWalk(e) {
    const walkEl = e.target.closest('.delete__walk');
    if (!walkEl) return;
    const walkIndex = this.#walks.findIndex(
      walk => walk.id === walkEl.dataset.id
    );

    // REMOVE WALK FROM #walks array
    this.#walks.splice(walkIndex, 1);
    // Remove Walk from localstorage
    localStorage.removeItem(walkEl.dataset.id);

    // remove walks
    walksList.innerHTML = '';
    // remove markers
    this._clearMarkers();

    // calculate steps from total and re-render
    this._calculateTotalSteps();
    this._renderSteps();

    // re-Render menu
    this.#walks.forEach(walk => this._renderWalk(walk));
    // re-Render marker
    this.#walks.forEach(walk => this._renderWalkMarker(walk));
  }

  _toggleHelp() {
    console.log('help button clicked');
  }

  _openModal() {
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }
  _closeModal() {
    modal.classList.add('hidden');
    overlay.classList.add('hidden');
  }
  _closeModalDocument(e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden'))
      this._closeModal();
  }
}

const app = new App();

// TODO: Greeting/Explanation
