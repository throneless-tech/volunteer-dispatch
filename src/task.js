const preconditions = require("preconditions").singleton();

class Task {
  /**
   * Task that folks can request help for.
   *
   * @param {string} rawTask representing a possible value in the "Tasks" field
   *  in "Requests" Airtable
   * @param {Array} supportRequirements Array of strings. Volunteers can specify how they
   *  can support. This is stored in the "I can provide the following support (non-binding)"
   *  field on the "Volunteers" Airtable
   * @param {Array} arbitraryRequirements Array of functions that return a boolean value if
   *  this errand has other arbitrary requirements.
   */
  constructor(rawTask, supportRequirements, arbitraryRequirements = []) {
    preconditions.shouldBeString(rawTask).shouldNotBeEmpty(rawTask);
    preconditions.shouldBeArray(supportRequirements);
    preconditions.shouldBeArray(arbitraryRequirements);
    arbitraryRequirements.forEach(preconditions.shouldBeFunction);
    this.rawTask = rawTask;
    this.supportRequirements = supportRequirements;
    this.otherFulfillmentRequirements = arbitraryRequirements;
  }

  /**
   * Check if a given volunteer can fulfill this task.
   *
   * This method is better housed in a volunteer matching utility or service class.
   * I am keeping it here for now because I did not want to introduce a new
   * service/util layer this early in the project. We might need it eventually, though.
   *
   * @param {object} volunteer Airtable record about volunteer
   * @returns {boolean} True if volunteer can fulfillt task.
   */
  canBeFulfilledByVolunteer(volunteer) {
    preconditions.shouldBeObject(volunteer);
    preconditions.shouldBeFunction(volunteer.get);
    const capabilities =
      volunteer.get("I can provide the following support (non-binding)") || [];
    // If the beginning of any capability matches the requirement,
    // the volunteer can handle the task
    return (
      (this.supportRequirements.length === 0 ||
        this.supportRequirements.some((r) =>
          capabilities.some((c) => c.startsWith(r))
        )) &&
      (this.otherFulfillmentRequirements.length === 0 ||
        this.otherFulfillmentRequirements.some((requirement) =>
          requirement(volunteer)
        ))
    );
  }

  equals(task) {
    return this.rawTask === task.rawTask;
  }
}

const doesVolunteerHaveACar = (volunteer) => {
  const transportationModes = volunteer.get(
    "Do you have a private mode of transportation with valid license/insurance? "
  );
  if (transportationModes) {
    return transportationModes;
  }
  return false;
};

Task.GROCERY_SHOPPING = new Task("Grocery shopping", [
  "Running errands (picking up groceries",
]);
Task.PRESCRIPTION_PICKUP = new Task("Picking up a prescription", [
  "Running errands (picking up groceries",
]);
Task.MEDICAL_APPT_TRANSPORTATION = new Task(
  "Transportation to/from a medical appointment",
  [],
  [doesVolunteerHaveACar]
);
Task.DOG_WALKING = new Task("Dog walking/petsitting", ["Pet-sitting"]);
Task.LONELINESS = new Task("Loneliness", [
  "Emotional support (talking on the phone with someone who is worried",
  "Checking in on disabled/elderly relatives nearby"
]);
Task.ACCESS_HEALTH_INFO = new Task("Accessing verified health information", [
  "Making doctors appointments",
  "Calling about medication refills",
  "Medical response (fielding calls with medical questions)",
  "Signing people up for health insurance",
]);
// Match most requirements since we don't know the nature of an "Other"
Task.OTHER = new Task("Other", [
  // grocery and prescription
  "Running errands (picking up groceries",
  // medical appt transportation
  "Transportation to/from a medical appointment",
  "Transportation",
  // petcare
  "Pet-sitting",
  // lonliness
  "Emotional support (talking on the phone with someone who is worried",
  // health access
  "Checking in on disabled/elderly relatives nearby",
  "Making doctors appointments",
  "Calling about medication refills",
  "Medical response (fielding calls with medical questions)",
  "Signing people up for health insurance",
  // langauge access
  'Translation (please list language in "other" box)',
  "Translation (ASL)",
  // other
  "Meal preparation",
  "Childcare",
  "Childcare (experienced care for high/special needs children)",
  "Household cleaning (dishwashing",
  "Spare bed/comfortable couch",
  "De-escalation, conflict resolution, peace-building skills",
  'Religious/spiritual ministry (please list faith tradition in "other" box)'
]);
Task.possibleTasks = [
  Task.GROCERY_SHOPPING,
  Task.PRESCRIPTION_PICKUP,
  Task.MEDICAL_APPT_TRANSPORTATION,
  Task.DOG_WALKING,
  Task.LONELINESS,
  Task.ACCESS_HEALTH_INFO,
  Task.OTHER,
];
const cache = {};
Task.possibleTasks.forEach((errand) => {
  cache[errand.rawTask] = errand;
});
Task.mapFromRawTask = (rawTask) => cache[rawTask];

module.exports = Task;
