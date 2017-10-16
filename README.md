## Flower Details and Images App

Example app using Express, and MongoDB.

###Configuration

```
npm install
```

Ensure public/uploads directory exists

set two environment variables

```
MONGO_USER = your username
MONGO_PW = your password
```


If you can't set these, then the app will use `mongodb://127.0.0.1:27017/garden` as the URL.


### Running tests


Install Mocha globally (this may not work on lab computers)

```
npm install -g mocha
```

Run tests from root directory of project with

```
npm test
```

or watch tests to re-run as they change with

```
mocha --watch --timeout 2000 test
```

If on lab computer, may need to use full path to mocha e.g.

```
c:\users\STARID\AppData\Roaming\npm\mocha --watch --timeout=2000 test
```


Can ignore or test files created in uploadTEST.