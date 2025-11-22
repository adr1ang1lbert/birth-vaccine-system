// src/data/kenyaLocations.js
// 🇰🇪 Converts kenya-counties.json → structured map: County → Constituency → Wards

import countiesData from "./kenya-counties.json";

const kenyaLocations = {};

countiesData.forEach((county) => {
  kenyaLocations[county.county_name] = {};
  county.constituencies.forEach((constituency) => {
    kenyaLocations[county.county_name][constituency.constituency_name] = constituency.wards;
  });
});

export default kenyaLocations;