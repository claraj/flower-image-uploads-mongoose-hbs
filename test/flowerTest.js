process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHTTP = require('chai-http');
let server = require('../app');
var expect = chai.expect;

// File operations
var fs = require('fs-extra');
var path = require('path');
var testUploadDir = require('../config/imageUploads').uploadDir;

var _ = require('lodash');

let mongodb = require('mongodb');
let ObjectID = mongodb.ObjectID;

let config = require('../config/db');

let test_db_url = config.url;

console.log('In the tests, db url is ' + test_db_url);
console.log('In the tests, upload dir  is ' + testUploadDir);


chai.use(chaiHTTP);


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
    
    
    it ('should create a new flower on POST to /newFlower', (done) => {
      chai.request(server)
        .post('/newFlower')
        .send( {name : 'sunflower', color: 'yellow' })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          // redirect to flower page
          expect(res.text).to.include('sunflower');
          expect(res.text).to.include('yellow');
  
          flowers.findOne( {name : 'sunflower'}).then( (doc) => {
            expect(doc).to.have.property('name', 'sunflower');
            expect(doc).to.have.property('color', 'yellow');
            done();
          })
          
        });
      
      
    });
    
    
    //TODO FAIL NO FLASH MESSAGE
    it ('should not create a new flower on POST to /newFlower when name is missing and show a flash error message', (done) => {
      chai.request(server)
        .post('/newFlower')
        .end((err, res) => {
          // redirect to home page, nothing created
          expect(res.text).to.include('enter a name for the flower'); // flash error
          flowers.find().count().then( (count) => {
            expect(count).to.be.equal(0);
            done();
          })
        });
    });
  
    
    it ('should create a new flower on POST to /newFlower when color is missing', (done) => {
      chai.request(server)
        .post('/newFlower')
        .send({ name : 'sunflower'})
        .end((err, res) => {
          // redirect to home page, nothing created
          expect(res.text).not.to.include('enter a name for the flower'); // no flash error
          expect(res.text).to.include('sunflower');
          expect(res.text).to.include('No color set');
  
          flowers.find( { name : 'sunflower' }).toArray().then( (docs) => {
            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.not.have.property('color');
            done();
          })
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
  
  
    it('should return 404 on POST to delete a flower document on POST to valid but not found _id', (done) => {
      chai.request(server)
        .post('/delete')
        .send({ '_id' : '_id=123456123456123456123456'})   //valid but doesn't exist
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
    
    let rose, daisy;
    
    let mockUserDir = path.join(__dirname, 'mockUserImages');
    
    
    beforeEach('insert two test documents', (done) => {
  
      fs.ensureDirSync(mockUserDir);
      fs.writeFileSync(path.join(mockUserDir, 'test_replace_daisy_image.jpg'), 'mock replace daisy image content');
      fs.writeFileSync(path.join(mockUserDir, 'test_new_rose_image.jpg'), 'mock new rose image content');
  
      fs.ensureDirSync(testUploadDir);
      fs.writeFileSync( path.join(testUploadDir, 'test_daisy_image.jpg'), 'mock daisy image content');
  
      
      flowers.insertMany(
        [
          {name: 'rose', color: 'pink'},
          {name: 'daisy', color: 'white', img_url: 'test_daisy_image.jpg'}
        ])
        
        .then((result) => {
          rose = result.ops[0];
          daisy = result.ops[1];
          return done();
        })
      
    });
  
    //TODO FAIL NO FLASH MESSAGE
    it('should not take any action if no file provided', (done) => {
  
      chai.request(server)
        .post('/setImage')
        .send({ _id : rose._id})   // valid ID but no image.
        .end((err, res) => {
          expect(res.status).to.be.equal(200);
          expect(res.text).to.include('Please provide an image file');
          flowers.findOne( { name : 'rose' }).next((doc) => {
            noChange = _.isEqual(rose, doc);
            expect(noChange).to.be.true;
            done();
          })
        });
      
    });
  
  
    it('should return 404 on post to /setImage if no _id provided', (done) => {
      chai.request(server)
        .post('/setImage')
        .end((err, res) => {
          expect(res.status).to.be.equal(404);
          done();
        });
    });

    
    it('should delete a flower document on POST to delete with body._id AND delete associated image' , (done) => {
      
      chai.request(server)
        .post('/delete')
        .send({ _id : daisy._id})
        .end((err, res) => {
        
          expect(res.status).to.be.equal(200);
          flowers.findOne({'_id' : daisy._id}).then((doc) => {
            
            expect(doc).to.be.null;
            
            // check the file system, the file should be removed
            var fileExists = fs.pathExistsSync( path.join(testUploadDir, daisy.img_url) );
            expect(fileExists).to.be.false
            done();
          })
        })
    });
    
    
    it('should delete a flower document on POST to delete with body._id AND not error if no associated image', (done) => {
      
      chai.request(server)
        .post('/delete')
        .send({ _id : rose._id})
        .end((err, res) => {
      
          expect(res.status).to.be.equal(200);
          flowers.findOne({'_id' : rose._id}).then((doc) => {
        
            expect(doc).to.be.null;
            done();
            
          })
        })
  
  
    });
    
    
    it('should add an image on POST to setImage body._id if flower does not have image', (done) => {
      
      var new_rose_img = 'test_new_rose_image.jpg';
      
      chai.request(server)
        .post('/setImage')
        //.send({ _id : rose._id})
        .attach('flower_image', fs.readFileSync( path.join(mockUserDir, new_rose_img) ), new_rose_img)
        .field("_id", rose._id.toString())
        .end((err, res) => {
          
          //  expect(res.status).to.be.equal(200);
          flowers.findOne({'_id' : rose._id}).then((doc) => {
            expect(doc).to.have.property('img_url');
            // expect doc.img_url file to exists
            let wasFileUploaded = fs.pathExistsSync( path.join( testUploadDir, doc.img_url));
            expect(wasFileUploaded).to.be.true;
  
  
            done();
        
          })
        })
    });
    
    
    it('should change the image on POST to setImage body._id if flower has image', (done) => {
      
      // daisy's original file was called test_daisy_image.jpg
      
      chai.request(server)
        .post('/setImage')
        .attach('flower_image', fs.readFileSync( path.join(mockUserDir, 'test_replace_daisy_image.jpg') ), 'test_replace_daisy_image.jpg')
        .field( '_id', daisy._id.toString())
        .end((err, res) => {
      
          expect(res.status).to.be.equal(200);
          flowers.findOne({ _id : daisy._id }).then((doc) => {
          
            expect(doc).to.have.property('img_url');
            
            let wasFileUploaded = fs.existsSync( path.join( testUploadDir, doc.img_url));
            expect(wasFileUploaded).to.be.true;
            
            let isOldFileThere = fs.existsSync( path.join(testUploadDir, "test_daisy_image.jpg") );
            expect(isOldFileThere).to.be.false;
            
            done();
            
          })
        })
  
    });
  
    
    afterEach('remove files in testUpload and mockUserDir directory', (done) => {
      
      // fs.unlinkSync( path.join(mockUserDir, 'test_new_rose_image.jpg') );
      // fs.unlinkSync( path.join(mockUserDir, 'test_replace_daisy_image.jpg') );
  
      
      //fs.unlinkSync( path.join(testUploadDir, 'test_daisy_image.jpg') );
      //
      //
      // let uploadedFiles = fs.readdirSync(testUploadDir);
      //
      // console.log(uploadedFiles);
      // for ( let x = 0 ; x < uploadedFiles ; x++ ) {
      //   fs.unlinkSync( path.join( testUploadDir, uploadedFiles[x])  );
      // }
      //
     
      done()
      
    });
   
    
  });   // end of describe images
  
  
});   // end of outer describe

