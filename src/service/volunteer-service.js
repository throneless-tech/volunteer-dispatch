const preconditions = require("preconditions").singleton();
const { Random, nodeCrypto } = require("random-js");

const AirtableUtils = require("../airtable-utils");
const { logger } = require("../logger");
const { getCoords } = require("../geo");
const config = require("../config");
const VolunteerRecord = require("../model/volunteer-record");
const Task = require("../task");

/**
 * APIs that interact with Volunteer
 */
class VolunteerService {
  constructor(base, airtableUtils) {
    preconditions.shouldBeObject(base);
    this.base = base;
    this.random = new Random(nodeCrypto);
    this.airtableUtils = airtableUtils;
  }

  /**
   * Resolve and update coordinates for volunteer's address
   *
   * @param {object} volunteer Request requiring coordinates
   * @returns {Promise<RequestRecord>} request records updated with coordinates
   * @throws error when unable to resolve coordinates or update them in airtable
   */
  async resolveAndUpdateCoords(volunteer) {
    preconditions.shouldBeObject(volunteer);
    preconditions.shouldBeString(volunteer.fullAddress);
    try {
      if (
        volunteer.coordinates &&
        (typeof volunteer.coordinatesAddress === "undefined" ||
          volunteer.coordinatesAddress.trim().length === 0 ||
          volunteer.coordinatesAddress === volunteer.fullAddress)
      ) {
        return volunteer;
      }
    } catch (e) {
      // error expected here
    }
    let volunteerCoords;
    try {
      volunteerCoords = await getCoords(volunteer.fullAddress);
    } catch (e) {
      // catch error so we can log it with logger and in airtable
      logger.error(
        `Error getting coordinates for volunteer ${volunteer.get(
          "Name"
        )} with error: ${JSON.stringify(e)}`
      );
      this.airtableUtils.logErrorToTable(
        config.AIRTABLE_REQUESTS_TABLE_NAME,
        volunteer,
        e,
        "getCoords"
      );
      // re-throw error because there is no point in continuing or returning something else
      // and we should let caller know that something went wrong.
      throw e;
    }
    let updatedRecord;
    try {
      updatedRecord = await this.base.update(volunteer.id, {
        _coordinates: JSON.stringify(volunteerCoords),
        _coordinates_address: volunteer.fullAddress,
      });
    } catch (e) {
      // catch error so we can log it with logger and in airtable
      logger.error(
        `Error getting coordinates for volunteer ${volunteer.get(
          "Full Name"
        )} with error: ${JSON.stringify(e)}`
      );
      this.airtableUtils.logErrorToTable(
        config.AIRTABLE_REQUESTS_TABLE_NAME,
        volunteer,
        e,
        "update _coordinates"
      );
      // re-throw error because there is no point in continuing or returning something else
      // and we should let caller know that something went wrong.
      throw e;
    }
    return new RequestRecord(updatedRecord);
  }

  /**
   * Honestly, this is being exposed for testing.
   *
   * @param {Array} lonelinessVolunteers to append to.
   * @returns {function(...[*]=)} A function that can be provided to Airtable's `eachPage` function
   */
  // eslint-disable-next-line class-methods-use-this
  appendVolunteersForLoneliness(lonelinessVolunteers) {
    return (volunteers, nextPage) => {
      volunteers
        .filter((v) => Task.LONELINESS.canBeFulfilledByVolunteer(v))
        .forEach((v) => lonelinessVolunteers.push(v));
      nextPage();
    };
  }

  /**
   * Fetches volunteers willing to to take on loneliness relates tasks
   *
   * @returns {Promise<[]>} Volunteers capable of handling loneliness tasks
   */
  async findVolunteersForLoneliness() {
    const lonelinessVolunteers = [];
    await this.base
      .select({
        view: config.AIRTABLE_VOLUNTEERS_VIEW_NAME,
        filterByFormula: "{Account Disabled} != TRUE()",
      })
      .eachPage(this.appendVolunteersForLoneliness(lonelinessVolunteers));
    const sampleSize =
      lonelinessVolunteers.length > 10 ? 10 : lonelinessVolunteers.length;
    return this.random.sample(lonelinessVolunteers, sampleSize);
  }
}

module.exports = VolunteerService;
