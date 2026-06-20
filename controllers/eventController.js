const Event = require("../models/Events");
const Registration = require("../models/Registration");

async function getAllEvents(req, res) {
  try {
    const events = await Event.find().sort({ date: 1 });
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const count = await Registration.countDocuments({
          event: event._id,
          status: "confirmed",
        });
        return {
          ...event.toObject(),
          registeredCount: count,
        };
      })
    );
    res.status(200).json(eventsWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    const count = await Registration.countDocuments({
      event: event._id,
      status: "confirmed",
    });
    res.status(200).json({
      ...event.toObject(),
      registeredCount: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function createEvent(req, res) {
  try {
    const event = await Event.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: "Invalid event data" });
  }
}

async function updateEvent(req, res) {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteEvent(req, res) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}   

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
