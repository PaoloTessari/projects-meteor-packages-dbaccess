var util = Npm.require("util");
var Future = Npm.require('fibers/future');
var Fiber = Npm.require('fibers');
var async = Npm.require('async');


DbCommandManager = function(connection) {
    this.connection = connection;
    this.command = null;
};


DbCommandManager.prototype.setCommand = function(command) {
  this.command = command;
};

SqlCommandManager = function(connection, dbTables) {
    DbCommandManager.call(this, connection);
    this.dbTables = dbTables;
    this.attrFields = [];
//    this.sql = '';


};

SqlCommandManager.prototype = Object.create(DbCommandManager.prototype);


SqlCommandManager.prototype.prepareSql = function(tableName, doc, action) {
    var future = new Future();
    var sql = '';
    if(action == 'i') {
        var fields =  this.getInsertFields(tableName,doc, false).wait();

        //console.log('fields:'+fields)
        // no fields to write in sql table
        if(fields == '')
            future.return( '');


        var params = this.getInsertFields(tableName,doc, true).wait();
        //console.log('params:'+params)

        future.return(util.format('INSERT INTO %s (%s) VALUES (%s)', tableName, fields,params));
    }
    else  if(action == 'u') {

        // no fields to write in sql table
        var fields = this.getUpdateFields(tableName,doc).wait();
        //console.log(fields);
        // no fields to write in sql table
        if(fields == '')
            future.return( '');
         else
           future.return( util.format("UPDATE %s set %s %s", tableName, fields, this.getFilter(tableName)));
    }
    else  if(action == 'd') {
        future.return( util.format("DELETE FROM  %s %s ", tableName, this.getFilter(tableName)));
    }
    return future.wait();
}.future();

/*
SqlCommandManager.prototype.prepareSql = function(tableName, doc, action) {
    var future = new Future();
    var sql = ''
    if(action == 'i') {
        var fields =  this.getInsertFields(tableName,doc, false).wait();

        //console.log('fields:'+fields)
        // no fields to write in sql table
        if(fields == '')
            future.return( '');


        var params = this.getInsertFields(tableName,doc, true).wait();
        //console.log('params:'+params)

        future.return(util.format('INSERT INTO %s (%s) VALUES (%s)', tableName, fields,params));
    }
    else  if(action == 'u') {

        // no fields to write in sql table
        var fields = this.getUpdateFields(tableName,doc).wait();
        //console.log(fields);
        // no fields to write in sql table
        if(fields == '')
            future.return( '');
        else
            future.return( util.format("UPDATE %s set %s %s", tableName, fields, this.getFilter(tableName)));
    }
    else  if(action == 'd') {
        future.return( util.format("DELETE FROM  %s %s ", tableName, this.getFilter(tableName)));
    }
    return future.wait();
}.future();
*/

SqlCommandManager.prototype.getFilter = function(tableName) {
    return (' WHERE mid = :_id');
};

// Return list of field as
// 'fieldName1, fieldName
// :fieldName1, fieldNamen (if asParam == true)
SqlCommandManager.prototype.getInsertFields = function (tableName,doc, asParam) {
    var self = this;

    var future = new Future();

    var result = '';
    var field = null;

    async.forEachOf(doc.o, function (itemValue, item, callback) {
        if (doc.o[item] && doc.o[item].constructor == {}.constructor && self.isPhysicalFieldName(item)) {
            async.forEachOf(doc.o[item], function (item2Value, item2, callback) {
                field = self.dbTables.field(tableName, item, item2);
                // for nested value  linkFieldName is mandatory
                if (field && field.linkFieldName && self.isPhysicalFieldName(field.linkFieldName))
                    result += asParam ? ':' + item + '_' + item2 + ',' : field.linkFieldName + ',';
                callback();
             },
             function (err) {
                //console.log('done bb' + item)
            });
            callback();
        }

        else {
            field = self.dbTables.field(tableName, item);
            if (field)
                result += asParam ? ':' + item + ',' : (field.linkFieldName || item) + ',';
            else {
                field = self.dbTables.field(tableName, '$DEF');
                if (field != null) {
                    self.dbTables.tableField(tableName, doc.o['defid'], item, function(field) {
                        if (field && self.isPhysicalFieldName(field.linkFieldName)) {
                            result += asParam ? ':' + item + ',' : (field.linkFieldName || item) + ',';
                            self.attrFields.push(_.extend({}, field));
                        }
                    });
                }
            }
            callback();
        }

    },
    function (err) {
        //console.log('done bb' + item)
        result = result.slice(0, -1);
        future.return(result);
    });


    /*
     Fiber(function () {
     var result = '';
     var field = null;
     for (var item in doc.o) {

     if (doc.o[item] && doc.o[item].constructor == {}.constructor) {
     for (var item2 in doc.o[item]) {
     field = self.dbTables.field(tableName, item, item2);
     // for nested value  linkFieldName is mandatory
     if (field && field.linkFieldName && self.isPhysicalFieldName(field.linkFieldName))
     result += asParam ? ':' + item + '_' + item2 + ',' : field.linkFieldName + ',';
     }
     }
     else {
     field = self.dbTables.field(tableName, item);
     if (field)
     result += asParam ? ':' + item + ',' : (field.linkFieldName || item) + ',';
     else {
     field = self.dbTables.field(tableName, '$DEF');
     if (field != null) {
     field = self.dbTables.tableField(tableName, doc.o['defid'], item).wait();
     if (field &&  self.isPhysicalFieldName(field.linkFieldName)) {
     result += asParam ? ':' + item + ',' : (field.linkFieldName || item) + ',';
     self.attrFields.push(_.extend({}, field));
     }

     }
     }
     }
     }
     result = result.slice(0, -1);
     future.return(result);
     }).run();
     */
    return future.wait();
}.future();

// Return list of field as
// 'fieldName1, fieldName
// :fieldName1, fieldNamen (if asParam == true)
SqlCommandManager.prototype.getUpdateFields = function (tableName,doc) {
    //var field = '';
    var self = this;

    //var set = _.extend({}, doc.o.$set || doc.o);


    var future = new Future();
    var result = '';
    var field;
    var set = _.extend({}, doc.o.$set || doc.o);
    var defid = null;

    self.dbTables.getDefId(tableName, doc.o2['_id'], function(id) {
       defid = id;

       async.forEachOf(set, function (itemValue, item, callback) {
           //var item = item;
           if (set[item] && set[item].constructor == {}.constructor && self.isPhysicalFieldName(item)) {

               async.forEachOf(set[item], function (item2Value, item2, callback) {

                   field = self.dbTables.field(tableName, item, item2);
                   // for nested value  linkFieldName is mandatory
                   if (field && field.linkFieldName && self.isPhysicalFieldName(field.linkFieldName))
                       result += util.format(" %s = :%s,", field.linkFieldName, item + '_' + item2);
                   callback();
               }, function (err) {
                   //console.log('done bb' + item)
               });
               callback();

           }
           else {
               field = self.dbTables.field(tableName, item);
               if (field && self.isPhysicalFieldName(field.linkFieldName || item)) {
                   result += util.format(" %s = :%s,", field.linkFieldName || item, item);
                   callback();
               }
               else if (defid) {

                   //field = self.dbTables.field(tableName, '$DEF');
                   //if(field != null) {

                   //field = self.dbTables.tableField(tableName, defid, item).wait();
                   self.dbTables.tableField(tableName, defid, item, function (field) {
                       if (field && self.isPhysicalFieldName(field.linkFieldName)) {
                           result += util.format(" %s = :%s,", field.linkFieldName || item, item);
                           self.attrFields.push(_.extend({}, field));
                       }
                       callback();

                   })

               }
               else
                  callback();

           }
       }, function (err) {
           //console.log('done aa' + result);
           if (result != '')
               result = result.slice(0, -1);
           future.return(result);
       });
   });
/*
    Fiber(function () {
        var result = '';
        var field;
        var set = _.extend({}, doc.o.$set || doc.o);
        var defid = null;

        if(self.dbTables.field(tableName, '$DEF') != null) {
            console.log( doc.o2['_id']);
            defid = self.dbTables.getDefId(tableName, doc.o2['_id']).wait();
            console.log('defid' + defid);
        }
        for (var item in set) {

            if(set[item] && set[item].constructor == {}.constructor) {
                for (var item2 in set[item]) {
                    field = self.dbTables.field(tableName, item, item2);
                    // for nested value  linkFieldName is mandatory
                    if(field && field.linkFieldName &&  self.isPhysicalFieldName(field.linkFieldName))
                      result += util.format(" %s = :%s,",field.linkFieldName, item+'_'+item2);
                }
            }
            else {
                field = self.dbTables.field(tableName, item);
                if(field && self.isPhysicalFieldName(field.linkFieldName || item))
                  result += util.format(" %s = :%s,", field.linkFieldName || item, item);
                else
                {
                    //field = self.dbTables.field(tableName, '$DEF');
                    //if(field != null) {
                    if(defid) {
                        field = self.dbTables.tableField(tableName, defid, item).wait();
                        if(field && self.isPhysicalFieldName(field.linkFieldName)) {
                            result += util.format(" %s = :%s,", field.linkFieldName || item, item);
                            self.attrFields.push(_.extend({}, field));
                        }

                    }
                }
            }
        }
        if(result != '')
            result = result.slice(0, -1);
        future.return(result);
    }).run();
*/
    return future.wait();
}.future();

/*
SqlCommandManager.prototype.getFields = function(tableName, fields) {
    var wait = Future.wait;
    var result = '';
    var self = this;
    Fiber(function () {
        var field;
        for (var item in fields) {
            if(fields[item].constructor == {}.constructor) {
                for(var item2 in fields[item]) {
                    field = self.dbTables.field(tableName, item, item2).wait();
                    // for nested value  linkFieldName is mandatory
                    if(field && field.linkFieldName)
                        result+= asParam ? ':'+item+'_'+item2+',' : field.linkFieldName+',';
                }
            }
            else {
                field = self.dbTables.field(tableName, item);
                if(field)
                    result += asParam ? ':' + item + ',' : (field.linkFieldName || item)+ ',';
                else
                {
                    field = self.dbTables.field(tableName, '$DEF');
                    if(field != null) {
                        field = self.dbTables.tableField(tableName, fields['_id'], item).wait();
                        if(field)
                            result += util.format(" %s = :%s,", field.linkFieldName || item, item);

                    }
                }
            }
        }
    }).run();
    console.log('end getfields');
    console.log(result);
    return result;
}
*/

SqlCommandManager.prototype.isPhysicalFieldName = function(fieldName) {
    return true;

};


SequelizeCommandManager = function(connection, dbTables) {
    SqlCommandManager.call(this, connection, dbTables);

    this.setCommand(new SequelizeCommand(connection));
};


SequelizeCommandManager.prototype = Object.create(SqlCommandManager.prototype);

SequelizeCommandManager.prototype.execSql = function(sql, doc, action) {
    try {
      var future = new Future();

      future.return(this.command.execSql(sql, doc, action).wait());
      return future.wait();
    }
      catch(e) {
          console.log(e);
          future.return(false);
          return future.wait();
      }
}.future();


SequelizeCommandManager.prototype.isPhysicalFieldName = function(fieldName) {
    return fieldName.toUpperCase().slice(0, 7) != 'DECODE_' &&
        fieldName.toUpperCase().slice(0, 5) != 'CALC_'

};


OpSequelizeCommandManager = function(connection, dbTables) {
    SequelizeCommandManager.call(this, connection, dbTables);
//    this.tableName = '';
};

OpSequelizeCommandManager.prototype = Object.create(SqlCommandManager.prototype);




OpSequelizeCommandManager.prototype.execSql = function(sql, tableName, doc, action) {
    try {

        var self = this;
        var future = new Future();
        var record =  action == 'u' ? _.extend({}, doc.o.$set || doc.o)  : _.extend({}, doc.o);
        if( action == 'u')
            record['_id'] = doc.o2['_id'].toString();
        else if(action == 'd')
            record['_id'] = doc.o['_id'].toString();

        if(action != 'd') {
            record = this.dbTables.normalizeRecord(tableName, record, self.attrFields);
        }

        future.return(this.command.execSql(sql, record, action).wait());
        console.log(sql);
        return future.wait();
    }
    catch(e) {
        console.log(e);
        future.return(false);
        return future.wait();

    }
}.future();






