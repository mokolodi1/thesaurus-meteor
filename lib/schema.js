Schema = {};

Schema.PartsOfSpeech = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "concept",
  "unspecified",
];

// 'Edge' describes a relationship between two synsets.
Schema.Edge = new SimpleSchema({
  type: {
    type: String,
    label: "The relationship between the owning synset and the target synset.",
  },
  target: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    label: "The ID of the other synset.",
  },
});

// A synset is a group of words that mean the same thing. It's a node in the synset graph.
Schema.Synset = new SimpleSchema({
  partOfSpeech: {
    type: String,
    allowedValues: Schema.PartsOfSpeech,
    label: "The part of speech - whether this synset is a noun, verb, etc.",
  },
  sense: {
    type: String,
    optional: true,
    label: "The sense of this concept - an optional field to disambiguate this synonym set from " +
           "others that use the same terms.",
  },
  definition: {
    type: String,
    optional: true,
    label: "The description of this concept (with markup)",
  },
  term: {
    type: String,
    label: "The preferred term for this synonym set",
  },
  termLower: {
    type: String,
    label: "Lowercase version of term, for sorting",
  },
  synonyms: {
    type: [String],
    label: "Additional terms for this synonym set",
  },
  edges: {
    type: [Schema.Edge],
    label: "The list of edges",
  },
  deleted: {
    type: Boolean,
    optional: true,
    label: "Whether this synset has been deleted",
  }
});

Synsets = new Mongo.Collection("synsets");
Synsets.attachSchema(Schema.Synset);

Schema.ChangeType = [
  "ADD",
  "UPDATE",
  "REMOVE",
];

// Describes a change record
Schema.ChangeInfo = new SimpleSchema({
  changeType: {
    type: String,
    allowedValues: Schema.ChangeType,
    label: "The type of change.",
  },
  user: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    label: "User responsible for this change.",
  },
  time: {
    type: Date,
    label: "When this change took place.",
  },
});

// Log entry for a change to a synset.
Schema.SynsetChange = new SimpleSchema({
  change: {
    type: Schema.ChangeInfo,
    label: "Time and user.",
  },
  before: {
    type: Schema.Synset,
    optional: true,
    label: "Value of the synset before the change.",
  },
  after: {
    type: Schema.Synset,
    optional: true,
    label: "Value of the synset after the change.",
  },
});
