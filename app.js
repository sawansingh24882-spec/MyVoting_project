const { error } = require('console');
const express = require('express');
const app = express();
const session = require('express-session');
const mysql = require('mysql');

//middleware

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "mysecretkey",
    resave: true,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.locals.st = req.session.loguser ? true : false;
    res.locals.uname = req.session.username || "";
    res.locals.msg = "";  // default msg
    next();
});

//Database connectivity
// const con = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "1234",
//     database: "mydb"
// });

// for hosting

require("dotenv").config();

const con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});


con.connect((err) => {
    if (err) throw err;
    console.log("Connected to MySQL database!");
});

// View Engine
app.set('view engine', 'ejs');

// Static Folder (CSS / images)
const path = require('path');
const { redirect } = require('react-router-dom');
app.use(express.static('static'));
app.use(express.static('static'));
var allvote = []



app.get('/', (req, res) => {
    res.render('nav')
});

app.get('/about', (req, res) => {
    res.render('about')
});

app.get('/home', (req, res) => {

    con.query(`select party,count(party) as totalvote from vote group by party `, function (err, result) {
        if (!err) {
            allvote = result
            console.log(result)

        }
        else {
           return res.render('home', { msg: "", uname: "", st: true, countvote: allvote })
        }

    })
    if (req.query.addParty) {
        let party = req.query.party;

        if (!party) {
            return res.render('home', { msg: "please enter the party name", uname: req.session.username, st: true, countvote: allvote })
        }
        con.query(`select * from party where pname ='${party}'`, function (err, result) {

            if (err) {
                console.log(err)
            }
            if (result.length > 0) {

                return res.render('home', { msg: "party already exist", countvote: allvote })
            }
            else {

                con.query(`insert into party(pname)value('${party}')`, function (err, result) {
                    if (!err) {
                        res.redirect('/home', { countvote: allvote })
                    }



                })
            }
        })

    }
    else if (req.query.removeParty) {
        let party = req.query.party;
        console.log(party)

        if (!party) {
            return res.render('home', { msg: "please enter the party name", uname: req.session.username, st: true, countvote: allvote })
        }
        con.query(`select * from party where pname = '${party}'`, function (err, result) {
            if (result.length == 0)
                return res.send("party not found"+err);
            else {
                con.query(`delete from party where pname = '${party}'`, function (err, result) {
                    if (!err) {
                        return res.redirect('/home', { countvote: allvote });
                    }
                })
            }
        })

    }
    else if (req.query.addVoter) {

        let name = req.query.name;
        let email = req.query.email;

        if (!name || !email) {
            return res.render('home', { msg: "Please provide name and email", uname: req.session.username, st: true, countvote: allvote });
        }

        con.query(`select * from voter where vemail = '${email}'`, function (err, result) {
            if (result.length > 0) {
                return res.render('home', { msg: "voter already exist", countvote: allvote });
            }
            con.query(`select * from voter`, function (err, result) {
                if (err) {
                    return res.send("error in db" + err)
                }

                var x = result.length;
                var p;

                if (x > 0) {
                    p = x + 111;
                }
                else {
                    p = 111;
                }

                con.query(
                    `insert into voter(vname,vemail,password) values('${name}','${email}','${p}')`,
                    function (err, result) {

                        if (err) {
                            return res.send("error in inserting " + err);
                        }
                        return res.render('home', { msg: "voter added successfully. Password: " + p, countvote: allvote });


                    });;
            })

        });

    }

    else if (req.query.removeVoter) {
        let name = req.query.name;
        let email = req.query.email;
        con.query(`select * from voter where vemail = '${email}'`, function (err, result) {
            if (result.length == 0)
                return res.render('home', { msg: "voter not found", countvote: allvote });
            else {
                con.query(`delete from voter where vemail = '${email}'`, function (err, result) {
                    if (!err) {
                        res.redirect('home', { countvote: allvote });
                    }
                })
            }
        })

    }

    else {
        res.render('home', { countvote: allvote })
    }

});


app.get('/login', (req, res) => {
    if (req.query.loginNow) {
        let email = req.query.email;
        let ps = req.query.ps;
        con.query(`select * from voter where vemail = '${email}' && password='${ps}'`, function (err, result) {
            if (!err) {

                if (result.length > 0) {
                    req.session.loguser = email;
                    req.session.username = result[0].vname
                    console.log(email)
                    res.render('home', { msg: "you have login successfully", uname: req.session.username, st: true, countvote: allvote })
                }
                else
                    return res.render("login", { msg: "Invalid Email or Password", countvote: allvote })

            }
            else
                res.send("Erorr " + err)

        })
    }
    else

        return res.render("login", { msg: "", uname: req.session.username, st: false, countvote: allvote })


})

app.get('/logout', (req, res) => {
    res.redirect('/login')
})

app.get('/vote', (req, res) => {
    if (req.session.loguser) {
        res.render('vote');
    }
    else {
        res.redirect('login');
    }
})

app.post('/vote', (req, res) => {
    if (req.session.loguser) {


        let party = req.body.party;
        let voterE = req.session.loguser;
        let d = new Date().toLocaleString();

        con.query(`select * from vote where voter='${voterE}'`, function (err, result) {
            if (result.length > 0) {
                res.render('vote', { msg: "you have already voted", uname: req.session.username, st: true, countvote: allvote });
                console.log("hlo")
            }
            else
                con.query(`insert into vote(party,voter,date)values('${party}','${voterE}','${d}')`, function (err, result) {
                    if (err) {
                        res.send("error in adding vote" + err);
                    }
                    res.render('vote', { msg: "congrats you voted", uname: req.session.username, st: true, countvote: allvote });

                })
        });





    }
    else
        res.redirect('login')
})

app.get('/result', (req, res) => {
    if (req.session.loguser) {
        if (req.query.search) {
            let search = req.query.search;
            con.query(`select * from vote where voter='${search}'or party='${search}'`, function (err, result) {
                if (err) {
                    res.render('result', { msg: ` voter '${search} is not found`, uname: req.session.username, st: true })
                }
                else {
                    res.render('result', { msg: "", uname: req.session.username, st: true, Data: result })
                }
            })
        }

        else {
            con.query(`select * from vote`, function (err, result) {
                res.render('result', { msg: "", uname: req.session.username, st: true, Data: result })


            })



        }



    }
    else {
        res.redirect('login');
    }
})

// app.listen(5000, () => {
//     console.log("server running");
// })

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("server running");
});