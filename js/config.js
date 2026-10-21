/*
  Optional analytics. Leave both values empty and the site makes ZERO tracking requests.

  Option A (recommended, free, no cookies): GoatCounter
    1. Sign up at https://www.goatcounter.com and pick a site code, for example "robotronics".
    2. Put that code below: goatcounterCode: "robotronics"

  Option B (free, uses cookies): Google Analytics 4
    1. Create a GA4 property and copy the Measurement ID (looks like G-XXXXXXXXXX).
    2. Put it below: ga4MeasurementId: "G-XXXXXXXXXX"
*/
window.ROBOTRONICS_CONFIG = {
  goatcounterCode: "",
  ga4MeasurementId: ""
};
