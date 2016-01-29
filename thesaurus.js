// Collections
SynsetChanges = new Mongo.Collection("synset-changes");
SynsetChanges.attachSchema(Schema.SynsetChange);

// Routes
FlowRouter.route('/import', {
  name: 'Thesaurus.import',
  action(params, queryParams) {
    BlazeLayout.render("pageContent", {content: "import"});
  }
});
FlowRouter.route('/', {
  name: 'Thesaurus.browse',
  action(params, queryParams) {
    BlazeLayout.render("pageContent", {content: "search_results", params: queryParams});
  }
});

// Presentation attributes for parts of speech.
let POSPresentation = {
  noun: { title: "Noun", order: 1, abbrev: "n" },
  verb: { title: "Verb", order: 2, abbrev: "v" },
  adjective: { title: "Adjective", order: 3, abbrev: "adj" },
  adverb: { title: "Adverb", order: 4, abbrev: "adv" },
  concept: { title: "Concept", order: 5, abbrev: "" },
};

// Presentation attributes for edges
let EdgePresentation = {
  antonym: { title: "Antonym", order: 1 },
  broader: { title: "Broader Term", order: 2 },
  narrower: { title: "Narrower Term", order: 3 },
  partof: { title: "Part Of", order: 4 },
  haspart: { title: "Has Part", order: 4 },
  aspectof: { title: "Aspect Of", order: 4 },
  hasaspect: { title: "Has Aspect", order: 4 },
  operandof: { title: "Operand Of", order: 4 },
  hasoperand: { title: "Has Operand", order: 4 },
  entails: { title: "Entails", order: 4 },
  entailedby: { title: "Entailed By", order: 4 },
  related: { title: "Related Term", order: 4 },
};

if (Meteor.isClient) {
  // counter starts at 0
  // Session.setDefault('counter', 0);

  Template.search_results.onCreated(function() {
//    Meteor.subscribe('Synset.search_text', list._id);
  });

  Template.search_results.helpers({
    synsets() {
      return Synsets.find({}, {sort: {termLower: 1}});
    },
    synsetQuery(token) {
      if (token) {
        // Regular expression escape
        token = token.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const re = new RegExp("\\b" + token);
        const cursor = Synsets.find(
          {$or: [
            {term: {$regex: re}},
            {synonyms: {$elemMatch: {$regex: re}}}
          ]},
          {sort: {termLower: 1}}
        );
        const groups = {};
        const groupArray = [];
        for (var ss of cursor.fetch()) {
          var group;
          if (groups.hasOwnProperty(ss.partOfSpeech)) {
            group = groups[ss.partOfSpeech];
          } else {
            group = { content: [] };
            groups[ss.partOfSpeech] = group;
            groupArray.push(group);
            let pos = POSPresentation[ss.partOfSpeech] || { title: ss.partOfSpeech, order: 1000 };
            group.title = pos.title;
            group.order = pos.order;
          }
          group.content.push(ss);
        }
        return _.sortBy(groupArray, 'order');
      }
    },
  });

  Template.synset_expandable.onCreated(function() {
    this.expandedOnce = false;
    this.expansionDep = new Tracker.Dependency;
    this.toggleExpansion = () => {
      let el = this.$('.synset');
      let icon = this.$('.js-icon');
      if (icon.hasClass('enabled')) {
        el.toggleClass('expand');
        if (el.hasClass('expand')) {
          // Attach synsets if not already
          if (!this.expandedOnce) {
            this.expandedOnce = true;
            this.expansionDep.changed();
          }
        }
      }
    }
    // this.content = new ReactiveDict();
  });

  Template.synset_expandable.helpers({
    pos(synset) {
      let pp = POSPresentation[synset.partOfSpeech];
      return pp ? pp.abbrev : synset.partOfSpeech;
    },
    expandableClass(synset) {
      return synset.edges.length > 0 ? 'enabled' : 'disabled';
    },
    childArgs(synset) {
      const instance = Template.instance();
      instance.expansionDep.depend();
      let groups = [];
      if (instance.expandedOnce) {
        const keys = _.pluck(synset.edges, 'target');
        const cursor = Synsets.find({_id: {$in: keys}});
        const targetsByKey = new Map;
        for (var target of cursor.fetch()) {
          targetsByKey[target._id] = target;
        }
        let groupsByRel = new Map;
        for (var edge of synset.edges) {
          var group = groupsByRel[edge.type];
          if (group == undefined) {
            group = groupsByRel[edge.type] = {
              presentation: EdgePresentation[edge.type],
              items: []
            };
            if (!group.presentation) {
              console.log("invalid pres:", edge.type);
            }
            groups.push(group);
          }
          group.items.push(targetsByKey[edge.target]);
        }
      }
      // TODO: Sort both groups and items
      return { groups: groups };
    },
  });

  Template.synset_expandable.events({
    'click .js-icon': function(event, instance) {
      instance.toggleExpansion();
    },
    'click .js-primary': function(event, instance) {
      instance.toggleExpansion();
    }
  });

  // Template.hello.events({
  //   'click button': function () {
  //     // increment the counter when button is clicked
  //     Session.set('counter', Session.get('counter') + 1);
  //   }
  // });
}

if (Meteor.isServer) {
  // Meteor.publish("Synset.search_text", function(token) {
  //   return Synsets.find({}, {sort: {'termLower': 1}});
  // });
  // Meteor.publish("Synset.search_pos", function(pos) {
  //   return Synsets.find({partOfSpeech: pos}, {sort: {'termLower': 1}});
  // });
  
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
