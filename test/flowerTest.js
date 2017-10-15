//process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHTTP = require('chai-http');
let server = require('../app');
let should = chai.should();   // call function
var expect = chai.expect;  // don't call function

var _ = require('lodash');

let mongodb = require('mongodb');
let ObjectID = mongodb.ObjectID;

let test_db_url = 'mongodb://127.0.0.1:27017/testGarden';
chai.use(chaiHTTP);

// Describe doesn't seem to like to live inside a mongo connect callback .

// describe("hello world", function () {
//   it("5 is equal to 5", function (done) {
//     expect(5).is.equal(5);
//     done();
//   });
//   it("5 is not equal to 15", function (done) {
//     expect(5).is.equal(15);
//     done();
//   });
// });

describe('open close db', () => {
  
  var flowers;
  var db;
  
  beforeEach('get flowers collection and delete all docs', function (done) {
    
    mongodb.connect(test_db_url)
      .then((gardendb) => {
        
        db = gardendb;
        flowers = db.collection('flowers');
        
        flowers.deleteMany({}).then(() => {
            return done();
          }
        )
        
      }) .catch((err) => {
      return done(err);
    });
  });
  
  afterEach('close DB connection', (done) => {
    db.close(true).then(() => { return done() })
      .catch((err) => { return done(err); });
  });
  
  
  describe("flower tests with empty database", function() {
    
    beforeEach('delete all documents', function (done) {
      flowers.deleteMany({}).then(() => {
        return done();
      }).catch((err) => {
        return done(err);
      });
    });
    
    
    it('No flower message when db is empty', function(done) {
      chai.request(server)
        .get('/')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.text).to.include("No flowers");
          done();
        });
    });
    
    
    it('should return 404 on GET to details/ID if id is not found', (done) => {
      
      chai.request(server)
        .get('/details')
        .end((err, res) => {
          expect(res.status).to.equal(404);
          
          chai.request(server)
            .get('/details/1234567')
            .end((err, res) => {
              expect(res.status).to.equal(404);
              
              chai.request(server)
                .get('/details/59e0ed7d4140789006aa5fae')  // A valid _id but not in the database.
                .end((err, res) => {
                  expect(res.status).to.equal(404);
                  done();
                });
            });
        });
      
    });
    
  });  // End of describe('flower tests with empty db')
  
  
  
  describe('flower tests start with one flower, a pink rose', function(){
    
    let rose;
    let _id;    // Of the test flower inserted into the database
    
    beforeEach('delete all documents', function (done) {
      
      flowers.insertOne({ name: 'rose', color: 'pink'}).then((result)=>{
        _id = result.insertedId;
        rose = result.ops[0];
        return done();
      }).catch((err) => {
        return done(err);
      });
    });
    
    
    it('should show a list of flowers if flowers in db', (done) => {
      chai.request(server)
        .get('/')
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.text).to.include('rose');
          expect(res.text).to.include('pink');
          done();
        });
    });
    
    
    it('should show a flowers details on GET to details/ID', (done) => {
      chai.request(server)
        .get('/details/' + _id)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.text).to.include('rose');
          expect(res.text).to.include('pink');
          done();
        });
    });
    
    
    it('should change a color on POST to setColor body._id', (done) => {
      chai.request(server)
        .post('/setColor')
        .send({'_id': _id, 'color': 'green'})
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.text).to.include('rose');
          expect(res.text).to.include('green');
          done();
        });
    });
    
    
    it('should not modify the flower document on POST to setColor if color is missing or empty string', (done) => {
      chai.request(server)
        .post('/setColor')
        .send({'_id': _id})
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.text).to.include('rose');
          expect(res.text).to.include('pink');   // no modifications
          flowers.findOne({ _id : ObjectID(_id)}).then((doc) =>{
            expect(doc.color).to.be.equal('pink');
            return done();
          }).catch((err) => { return done(err); });
        });
    });
    
    
    
    it('should return 404 on POST to setColor if color provided but _id is missing or not found', (done) => {
      chai.request(server)
        .post('/setColor')
        .send({ color : 'blue'})
        .end((err, res) => {
          expect(res.status).to.equal(404);
          
          chai.request(server)
            .post('/setColor')
            .send({'_id' : '345345354', color : 'blue'})
            .end((err, res) => {
              expect(res.status).to.equal(404);
              return done();
            })
          
        })
    });
    
    
    it('should delete a flower document with no image, on POST to delete with body._id', (done) => {
      chai.request(server)
        .post('/delete')
        .send({ '_id' : _id})
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.req.path).to.be.equal('/');         // TODO cleaner way of checking redirect?
          flowers.findOne({_id : _id}).then((doc) => {
            expect(doc).to.be.null;
            return done();
          }).catch((err) => { done(err); })
          
        })
    });
    
    
    
    it('should return 404 on POST to delete a flower document on POST to delete invalid _id', (done) => {
      chai.request(server)
        .post('/delete')
        .send({ '_id' : 'dsfsdfsdfsd'})   //invalid
        .end((err, res) => {
          expect(res.status).to.be.equal(404);
          flowers.findOne({_id: _id}).then((doc) => {
            let rose_equals_doc = _.isEqual(doc, rose);
            expect(rose_equals_doc).to.be.true;
            return done();
          });
        });
    });
    
    
    it('should return 404 on POST to delete a flower document on POST to delete no _id', (done) => {
      chai.request(server)
        .post('/delete')
        .end((err, res) => {
          
          expect(res.status).to.be.equal(404);
          flowers.findOne({_id: _id}).then((doc) => {
            let rose_equals_doc = _.isEqual(doc, rose);
            expect(rose_equals_doc).to.be.true;
            return done();
          });
        });
    });
    
    
  });
  
  
  
  describe('Flowers with images operations', () => {
    
    let _id;    // Of the test flower inserted into the database
    let rose;
    
    beforeEach('insert two test documents', function (done) {
      
      flowers.insertMany(
        [{ name: 'rose', color: 'pink'},
        { name: 'daisy', color: 'white'}]).then((result)=>{
        _id = result.insertedId;
        rose = result.ops[0];
        return done();
      }).catch((err) => {
        return done(err);
        
      })
    });
    
    
    it('should add an image on POST to setImage body._id if flower does not have image');
    
    
    it('should change the image on POST to setImage body._id if flower has image');
    
    
    it('should delete a flower document on POST to delete with body._id AND delete associated image' , (done) => {
      chai.request(server)
        .post('/delete')
        .send({ _id : _id})
        .end((err, res) => {
          flowers.findOne({'_id' : _id}).then((doc) => {
            expect(doc).to.be.null;
            // NOT FINSISHED fail('finish this test');
            return done()
          })
        })
    }   );
    
    it('should delete a flower document on POST to delete with body._id AND not error if no associated image');
    
  });   // end of describe images
  
  
});   // end of outer describe

