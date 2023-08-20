require('dotenv').config()
const express = require('express');
const axios = require('axios');
const https=require("https")
const bodyParser=require("body-parser");
const session=require('express-session')
const passport=require('passport')
const passportLocalMongoose=require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Configuration, OpenAIApi } = require("openai");
const readlineSync = require("readline-sync");

const app = express();

const ejs = require("ejs");
const mongoose = require('mongoose');
const findOrCreate=require("mongoose-findorcreate")
const PORT = process.env.PORT || 3000;
const API_KEY = 'HGA6Q79ZGZ4X8WGPDC70H2QDBYCD'; // Replace with your actual API key
const apiUrl = 'https://beta4.api.climatiq.io/estimate';
CLIENT_ID="689381984804-4mrhasactisoqtg1resmd26nffc3p36i.apps.googleusercontent.com"
CLIENT_SECRET="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"
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
  
}))
app.use(passport.initialize())
app.use(passport.session())
mongoose.connect("mongodb://127.0.0.1:27017/carbonuserDB");

const userSchema= new mongoose.Schema({
  email:String,
  password:String,
  googleId:String
})
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/home.html');
});

app.get('/estimate', async (req, res) => {
  try {
    const activityId = req.query.activityId;
    console.log('Activity ID:', activityId);

    const requestData = {
      emission_factor: {
        activity_id: activityId,
        data_version: '^3'
      },
      parameters: {
        energy: 4200,
        energy_unit: 'kWh'
      }
    };

    const response = await axios.post(apiUrl, requestData, {
      headers: {
        Authorization: `Bearer ${API_KEY}`
      }
    });

    const carbonEstimate = response.data;
    res.json(carbonEstimate);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'An error occurred' });
  }
});
app.post("/", function(req,res){
   

  const query=req.body.cityname;
const apikey="fb337cdc301c514e1fcee11a5b4941a9";
const unit="metric";

const url="https://api.openweathermap.org/data/2.5/weather?q="+query+"&appid="+ apikey +"&units="+unit;
https.get(url,function(response){
   console.log(response.statusCode);


response.on("data",function(data){
  const weatherdata= JSON.parse(data);
  const temp=weatherdata.main.temp;
  const weatherDescription=weatherdata.weather[0].description;
  const icon=weatherdata.weather[0].icon;
  res.write(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather Report</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        text-align: center;
        margin: 0;
        padding: 0;
        background-color: #f3f3f3;
      }
      .weather-container {
        background-color: #fff;
        border-radius: 10px;
        box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
        padding: 20px;
        max-width: 400px;
        margin: 0 auto;
        margin-top: 20px;
      }
      h1 {
        font-size: 24px;
        margin-bottom: 10px;
      }
      p {
        font-size: 16px;
        margin-bottom: 10px;
      }
      img {
        max-width: 100px;
        height: auto;
      }
    </style>
  </head>
  <body>
    <div class="weather-container">
      <h1>Temperature in ${query} is ${temp} Degree Celsius</h1>
      <p>Weather description is ${weatherDescription}</p>
      <img src="http://openweathermap.org/img/wn/${icon}@2x.png">
    </div>
  </body>
  </html>
`);
res.end();

 

    })
}
);
});


const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});
passport.use(new GoogleStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/index",
  userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile)
  User.findOrCreate({username:profile.displayName, googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/",function(req,res){
    res.render("home.html");
})
app.get("/auth/google",
  passport.authenticate("google", {scope:['profile']})
)
app.get('/auth/google/index', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/index');
  });
app.get("/login",function(req,res){
    res.render("login");
})
app.get("/register",function(req,res){
    res.render("register");
})
app.get("/index",function(req,res){
  if(req.isAuthenticated){
    res.render("index");
  }
  else{
    res.redirect("login");
  }
})
app.get("/logout",function(req,res){
  req.logout(req.user, err => {
    if(err) return next(err);
    res.redirect("/");
  })
})

app.post("/register",  function(req,res){

  //bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    // Store hash in your password DB.
    //const newUser=new User({
      //email:req.body.username,
     // password:hash
 // })
 // newUser.save().then(savedDoc => {
    //  if (savedDoc === newUser) {
      //  res.render("secrets")
     // } // true
    //});
//});
User.register({username: req.body.username}, req.body.password, function(err, user){
  if(err){
      console.log(err);
      return res.redirect("/register");
  }
  passport.authenticate("local")(req, res, function(){
    res.redirect("/index");
});
})
})
app.post("/login",async function(req,res){
   // const username=req.body.username;
    //const password=req.body.password;

    // const myuser=await User.findOne({email:username})
    // bcrypt.compare(password, myuser.password, function(err, result) {
     
      //if(result===true){
//res.render("secrets");
      //}
  //});
const user=new User({
  username:req.body.username,
  password:req.body.password
})
  
req.login(user,function(err){
  if(err){
    console.log(err)
  }
  else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/index");
  });
  }
})

     
})
app.get("/logout",function(req,res){
  req.logout(req.user, err => {
    if(err) return next(err);
    res.redirect("/");
  })
})



// Assuming you're using Express.js and MongoDB with Mongoose

// User Model

// ... (Your existing code)

app.get('/calculate-aqhi', (req, res) => {
  res.render('calculate-aqhi');
});

app.post('/calculate-aqhi', async (req, res) => {
  const { O3, NO2, PM } = req.body;

  const options = {
    method: 'GET',
    url: 'https://carbonfootprint1.p.rapidapi.com/AirQualityHealthIndex',
    params: {
      O3: O3,
      NO2: NO2,
      PM: PM
    },
    headers: {
      'X-RapidAPI-Key': '387968b1cdmsh3f4097cba6d01a5p12bd6fjsn22ecdaf6f19f',
      'X-RapidAPI-Host': 'carbonfootprint1.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const aqhi = response.data; // Air Quality Health Index

    // Render the result to the user
    res.render('calculate-aqhi', { aqhi });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while calculating AQHI');
  }
});

// ... (Your existing code)
app.get('/calculate-aqhi', (req, res) => {
  const aqhiValue = req.query.aqhi;

  res.render('calculate-aqhi.ejs', { aqhi: aqhiValue });
});

app.post('/calculate-aqhi', (req, res) => {
  // Calculate AQHI based on user input (O3, NO2, PM)
  const aqhiValue = calculateAQHI(req.body.O3, req.body.NO2, req.body.PM);

  // Add a short delay before redirecting
  setTimeout(() => {
    // Redirect back to the same page with the calculated AQHI value
    res.redirect(`/calculate-aqhi?aqhi=${aqhiValue}`);
  }, 1000); // Delay in milliseconds (1 second)
});

app.get('/calculate-carbon-footprint', (req, res) => {
  res.render('calculate-carbon-footprint', { carbonFootprintData: null });
});

app.post('/calculate-carbon-footprint', async (req, res) => {
  try {
    const distance = req.body.distance;
    const vehicle = req.body.vehicle;

    const options = {
      method: 'GET',
      url: 'https://carbonfootprint1.p.rapidapi.com/CarbonFootprintFromCarTravel',
      params: {
        distance: distance,
        vehicle: vehicle
      },
      headers: {
        'X-RapidAPI-Key': '387968b1cdmsh3f4097cba6d01a5p12bd6fjsn22ecdaf6f19f',
        'X-RapidAPI-Host': 'carbonfootprint1.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    const carbonFootprintData = response.data;

    res.render('calculate-carbon-footprint', { carbonFootprintData });
  } catch (error) {
    console.error(error);
    res.render('error', { error: 'An error occurred' });
  }
});

app.get('/calculate-flight-carbon', (req, res) => {
  res.render('calculate-flight-carbon.ejs', { flightCarbonData: null });
});

// Route for handling form submission
app.post('/calculate-flight-carbon', async (req, res) => {
  const distance = req.body.distance;
  const flightType = req.body.flightType;

  const options = {
    method: 'GET',
    url: 'https://carbonfootprint1.p.rapidapi.com/CarbonFootprintFromFlight',
    params: {
      distance: distance,
      type: flightType
    },
    headers: {
      'X-RapidAPI-Key': '387968b1cdmsh3f4097cba6d01a5p12bd6fjsn22ecdaf6f19f',
      'X-RapidAPI-Host': 'carbonfootprint1.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const flightCarbonData = response.data;
    res.render('calculate-flight-carbon.ejs', { flightCarbonData: flightCarbonData });
  } catch (error) {
    console.error(error);
    res.render('calculate-flight-carbon.ejs', { flightCarbonData: null });
  }
});

app.get('/calculate-fuel-co2e', (req, res) => {
  res.render('calculate-fuel-co2e');
});

app.post('/calculate-fuel-co2e', async (req, res) => {
  const fuelType = req.body.fuelType;
  const litres = req.body.litres;

  const options = {
    method: 'GET',
    url: 'https://carbonfootprint1.p.rapidapi.com/FuelToCO2e',
    params: {
      type: fuelType,
      litres: litres
    },
    headers: {
      'X-RapidAPI-Key': '387968b1cdmsh3f4097cba6d01a5p12bd6fjsn22ecdaf6f19f',
      'X-RapidAPI-Host': 'carbonfootprint1.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const fuelCO2eData = response.data;
    res.render('calculate-fuel-co2e', { fuelCO2eData });
  } catch (error) {
    console.error(error);
    res.render('calculate-fuel-co2e', { error: 'An error occurred while fetching data' });
  }
});

app.get('/openai-form', (req, res) => {
  res.render('openai-form'); // Renders the openai-form.ejs template
});
app.post('/openai-form', async (req, res) => {
  
    const userMessage = req.body.userMessage;
    const options = {
      method: 'POST',
      url: 'https://simple-chatgpt-api.p.rapidapi.com/ask',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': '387968b1cdmsh3f4097cba6d01a5p12bd6fjsn22ecdaf6f19f',
        'X-RapidAPI-Host': 'simple-chatgpt-api.p.rapidapi.com'
      },
      data: {
        question: userMessage
      }
    };
try{
    const response = await axios.request(options);
    const chatbotResponse = response.data;

    res.render('openai-form', {  chatbotResponse });
  } catch (error) {
    console.error(error);
    res.render('openai-form', { error: 'An error occurred while fetching data' }); // Handle error case
  }
});







app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

