let Tone = require("tone")
let Pattern = require("./Pattern")

class SequencePattern extends Pattern{
	constructor() {
		super()
		// synth must support polyphony
		this.instrument = new Tone.PolySynth(6, Tone.Synth).toMaster()
		this.sequence = []

		this.holdTime = "16n"
		// eventually this can be set from higher, e.g. at the project level
		this.baseNote = Tone.Frequency("A4")

		this.view = {}

		// what section of the pattern the LP is currently focusing on (in 32n)
		this.view.positionOffset = 0
		// note shift up/down relative to the base note
		this.view.noteOffset = 0
		// note "resolution" of the LP view (e.g. each grid is a 32nd note, 16th note, etc)
		// this is turned into Tone's representaiton of a note
		// just use 4 for 4n, 8 for 8n, etc.
		this.view.noteZoom = 8

		// the note value, relative to the baseNote,
		this.part = new Tone.Part((time, data) => {
			console.log("Triggered!")
			console.log(data)
			this.instrument.triggerAttackRelease(Object.values(data.notes), this.holdTime)
		})
		this.part.loop = true
		this.part.start("@1m")
	}

	activate() {
		this.onHandlerId = Launchpad.on("noteon", (row, col) => {
			// get note from row
			let note = new Tone.Frequency((row - 1) + this.baseNote.toMidi() + this.view.noteOffset, "midi")

			// get position from col
			let time = ((col - 1) + this.view.positionOffset) + " * " + this.view.noteZoom + "n"

			console.log("Note: " + note.toNote())
			console.log("Position: " + time)


			if(this.part.at(time) === null) {
				// part at time doesn't exist, create it (and add the note, since that definitely did not exist)
				console.log("Creating part.")
				let notesObj = []
				notesObj[note.toMidi()] = note
				this.part.at(time, {
					notes: notesObj,
					hold: [this.holdTime],
				})
				Launchpad.setPad(row, col, "on", 49)
			} else {
				// part exists at this time, modify it
				let partAtTime = this.part.at(time).value

				if(!partAtTime.notes[note.toMidi()]) {
					// note doesn't exist, add it
					partAtTime.notes[note.toMidi()] = note
					Launchpad.setPad(row, col, "on", 49)
				} else {
					// note exists, remove it
					delete partAtTime.notes[note.toMidi()]
					Launchpad.setPad(row, col, "off")

					// if we were left with an empty array, delete the part
					if(partAtTime.notes.length === 0) {
						this.part.remove(time)
					}
				}

				this.part.at(time, partAtTime)
			}

			console.log(this.part.at(time))
		})

		this.offHandlerId = Launchpad.on("noteoff", (row, col) => {
			// console.log("Note off handler")
		})

	}

	deactivate() {
		// remove event handlers
		Launchpad.off("noteon", this.onHandlerId)
		Launchpad.off("noteoff", this.offHandlerId)
	}
}

module.exports = SequencePattern