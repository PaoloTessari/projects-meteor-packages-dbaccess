var Future = Npm.require('fibers/future');
 Log = function(error, msg) {
    console.log("Error "+error+ " msg "+msg);

}

//var t = {};

//t.MongoConnection = Meteor.wrapAsync(TestMongoConnection)

var connManager = new DbConnectionManager(Meteor.settings.DbConnections);

/**
 * Created by paolo on 06/12/15.
 */
Tinytest.add('MongoConnectionOpen', function (test) {
/*
    mongoConn = new MongoConnection(Meteor.settings.DbConnections['TEX']);
    test.equal( mongoConn.open().wait(), false);
*/
    test.isNotNull(connManager.open('TEX').wait());

});


Tinytest.add('MongoConnectionClose', function (test) {
/*
    if(mongoConn != null) {
        test.equal(mongoConn.close().wait(), false);
    }
    connManager.add('TEX');
*/
    test.equal(connManager.close('TEX').wait(), false);
});


Tinytest.add('POSTGRESConnectionOpen', function (test) {
/*
      var f = function(seqConn) {
        return new Promise(function (fulfill, reject){
            seqConn.open( function(err) {
                if (err) reject(err);
                else fulfill(err);
            });
        });
    }
    seqConn = new SequelizeConnection(Meteor.settings.DbConnections['PLMSQL']);
    f(seqConn).then(function(err) {
        test.equal(err,false);
    });

   /*seqConn.open(function(err) {
       C
   });
    //next();
    */
    test.isNotNull(connManager.open('POSTGRES').wait());
});

Tinytest.add('MSSQLConnectionOpen', function (test) {
    /*
     var f = function(seqConn) {
     return new Promise(function (fulfill, reject){
     seqConn.open( function(err) {
     if (err) reject(err);
     else fulfill(err);
     });
     });
     }
     seqConn = new SequelizeConnection(Meteor.settings.DbConnections['PLMSQL']);
     f(seqConn).then(function(err) {
     test.equal(err,false);
     });

     /*seqConn.open(function(err) {
     C
     });
     //next();
     */
    test.isNotNull(connManager.open('MSSQL').wait());
});



Tinytest.add('POSTGRESConnectionClose', function (test) {

    //test.equal(seqConn.close(), false);
    test.equal(connManager.close('POSTGRES').wait(), false);

});

Tinytest.add('MSSQLConnectionClose', function (test) {

    test.equal(connManager.close('MSSQL').wait(), false);

});


Tinytest.add('DbDef', function (test) {

    var dbDef = new DbDef(Meteor.settings.Def);
    var fields = dbDef.getCollection('doc');
    console.log(fields);
    test.isNotNull(fields);
});




