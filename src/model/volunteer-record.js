const Task = require("../task");
const config = require("../config");

/**
 * Volunteer for help.
 */
class VolunteerRecord {
  constructor(airtableVolunteer) {
    this.airtableVolunteer = airtableVolunteer;
  }

  /**
   * Get other field from airtable.
   *
   * @param {object} field to get from airtable record
   * @type {*} The Airtable field.
   */
  get(field) {
    return this.airtableVolunteer.get(field);
  }

  /**
   * ID of the record
   *
   * @type {string}
   */
  get id() {
    return this.airtableVolunteer.id;
  }

  /**
   * "fields" property from the underlying airtable record.
   *
   * @type {object}
   */
  get rawFields() {
    return this.airtableVolunteer.fields;
  }

  /**
   * Address of the volunteer.
   *
   * @type {string} The volunteer address, including street, city and state.
   */
  get fullAddress() {
    return `${this.get("Address")} ${
      config.VOLUNTEER_DISPATCH_CITY
    }, ${
      config.VOLUNTEER_DISPATCH_STATE
    }`;
  }

  /**
   * Co-ordinates if they are available.
   *
   * @type {object} Geo co-ordinates.
   */
  get coordinates() {
    return JSON.parse(this.get("_coordinates"));
  }

  /**
   * Address used to resolve coordinates.
   *
   * @see coordinates
   * @type {string} Address co-ordinates.
   */
  get coordinatesAddress() {
    return this.get("_coordinates_address");
  }
}

module.exports = VolunteerRecord;
