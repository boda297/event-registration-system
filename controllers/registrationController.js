const Registration = require("../models/Registration");
const Event = require("../models/Events");

async function submitRegistration(req, res) {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.capacity > 0) {
      const count = await Registration.countDocuments({
        event: event._id,
        status: "confirmed",
      });
      if (count >= event.capacity) {
        return res.status(400).json({ error: "Event is full" });
      }
    }
    const registration = await Registration.create({
      event: event._id,
      user: req.user.id,
    });

    res.status(201).json(registration);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "Already registered for this event" });
    }
    res.status(500).json({ error: "Server error" });
  }
}

async function getMyRegistrations(req, res) {
  try {
    const registrations = await Registration.find({ user: req.user.id })
      .populate("event", "title date")
      .sort({ createdAt: -1 });

    res.status(200).json(registrations);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

async function deleteMyRegistration(req, res) {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ error: "Not found" });

    if (registration.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not your registration" });
    }

    registration.status = "cancelled";
    await registration.save();
    res.json({ message: "Registration cancelled" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  submitRegistration,
  getMyRegistrations,
  deleteMyRegistration,
};
