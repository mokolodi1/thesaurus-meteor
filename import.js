// I see you're a single quote person. I think it'd be fine to have the social
// network app be a single-quote app. Within an app the quote utilization
// should be consistant. (You might have to police me if I make commits...)

Meteor.methods({
  importDb: function(xmlData) {
    // I actually didn't know about this.isSimulation...
    // The better solution here would be to put this in the server folder,
    // which is only loaded on the server.
    if (this.isSimulation) {
      // Can't run NPM packages on the client.
      return;
    }
    // Interesting choice to load this every time. I think it makes sense in
    // this case because you don't expect to be doing this very much.
    let xml2json = Meteor.npmRequire('xml2json');
    let data = xml2json.toJson(xmlData, { object: true, sanitize: false } );
    let synsetTable = undefined;
    let changeTable = undefined;
    for (var table of data.database.table) {
      if (table.type == 'Synset') {
        synsetTable = table;
      } else if (table.type == 'SynsetChange') {
        changeTable = undefined;
      }
    }

    // Delete all existing data
    Synsets.remove({});

    // Transform repeated child nodes into arrays.
    // Your comments are well chosen and helpful.
    function normalizeArray(json, field) {
      if (json[field] == undefined) {
        json[field] = [];
      } else if (!(json[field] instanceof Array)) {
        json[field] = [json[field]];
      }
    }

    let recordsById = {};
    let records = [];
    for (var ss of synsetTable.synset) {
      normalizeArray(ss, 'synonym');
      normalizeArray(ss, 'edge');
      var definition = ss.definition;
      if (!definition) {
        definition = "";
      }
      if (ss.pos == 'category') {
        ss.pos = 'concept';
      }
      let ssRecord = {
        partOfSpeech: ss.pos,
        definition: definition,
        term: ss.synonym[0],
        termLower: ss.synonym[0].toLowerCase(),
        synonyms: ss.synonym.slice(1),
        edges: [],
      };
      if (ss.deleted) {
        ssRecord.deleted = ss.deleted;
      }
      if (ss.sense) {
        ssRecord.sense = ss.sense;
      }
      recordsById[ss.id] = ssRecord;
      records.push(ssRecord);
      // ES2016!! :)
      ssRecord._id = Synsets.insert(ssRecord, (err, newId) => {
        if (err) {
          console.log(err);
        }
      });
    }

    let inverseEdgeType = {
      'related' : 'related',
      'antonym' : 'antonym',
      'broader' : 'narrower',
      'narrower' : 'broader',
      'partof' : 'haspart',
      'haspart' : 'partof',
      'operateson' : 'operandof',
      'operandof' : 'operateson',
      'entails' : 'entailedby',
      'entailedby' : 'entails',
      'aspectof' : 'hasaspect',
      'hasaspect' : 'aspectof',
    };

    function addEdge(ss, targetId, relation) {
      for (var edge of ss.edges) {
        if (targetId == edge.target) {
          edge.type = relation;
          return;
        }
      }
      ss.edges = ss.edges.concat([{target: targetId, type:relation}]);
    }

    for (var ss of synsetTable.synset) {
      if (ss.edge && ss.edge.length > 0) {
        for (var edge of ss.edge) {
          let ssFrom = recordsById[ss.id];
          let ssTo = recordsById[edge.target];
          if (!ssFrom) {
            throw new Error("Unknown record with id: " + ss.id);
          }
          if (!ssTo) {
            throw new Error("Unknown record with id: " + edge.target);
          }
          let inverse = inverseEdgeType[edge.type];
          if (!inverse) {
            throw new Error('Unknown edge type: ' + edge.type);
          }
          addEdge(ssFrom, ssTo._id, edge.type);
          addEdge(ssTo, ssFrom._id, inverse);
        }
      }
    }

    for (var ssRecord of records) {
      if (ssRecord.edges) {
        Synsets.update(ssRecord._id, {$set: {edges: ssRecord.edges}});
      }
    }

    console.log("Synset count:", Synsets.find().count());
  }
});

// Would be better in the client directory, but I think you're just using
// what you got in the examples.
if (Meteor.isClient) {
  Template.import.events({
    "submit .data-import": function(event) {
      // Prevent default browser form submit.
      event.preventDefault();

      // Get value from form element.
      var files = event.target.importFile.files;
      if (files.length) {
        // TIL FileReader
        var reader = new FileReader();
        reader.onload = function(e) {
          Meteor.call("importDb", e.target.result);
        };
        reader.readAsText(files[0]);
      }
    }
  });
}
