const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const auth = require('../middleware/auth');


//register route
router.post("/register", async (req,res) => {
    try{
    let {email, password, passwordCheck, displayName} = req.body;
    //validate
    if (!email || !password || !passwordCheck){
        return res.status(400).json({msg: "Not all fields are entered"});
    }
    if (password.length < 5){
        return res.status(404).json({msg: "The password needs to be atleast five characters long"});
    }
    if (password != passwordCheck){
        return res.status(404).json({msg: "Enter the same password twice for verification"});
    }
    const existingUser = await User.findOne({email: email});
    if (existingUser){
        return res.status(400).json({msg: "Account with this email already exists"});
    }
    if (!displayName){
        displayName = email;
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
        email,
        password: passwordHash,
        displayName
    });
    const savedUser = await newUser.save();
    res.json(savedUser);
} catch(err){
    res.status(500).json({error: err.message});
}
});


//login route
router.post('/login', async(req,res) => {
    try{
        const { email, password } = req.body;

        if (!email || !password){
            return res.status(400).json({msg: "Not all fields are entered"});
        }
        const user = await User.findOne({email: email});
        if (!user){
            return res.status(400).json({msg: "No account with this email"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch){
            return res.status(400).json({msg: "Invalid credentials"});
        }

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET);
        res.json({
            token,
            user: {
                id: user._id,
                displayName: user.displayName
            }
        });
    } catch(err){
        res.status(500).json({error: err.message});
    }
});

//delete your account
router.delete('/delete', auth, async (req, res) => {
    try{
        const deletedUser = await User.findByIdAndDelete(req.user);
        res.json(deletedUser);
    } catch(err){
        res.status(500).json({error: err.message});
    }
});

router.post('/tokenIsValid', async (req,res) => {
    try{
        const token = req.header('x-auth-token');
        if (!token){
            return res.json(false);
        }
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (!verified) return res.json(false);
        
        const user = await User.findById(verified.id);
        if (!user) return res.json(false);

        return res.json(true);
    } catch(err) {
        return res.status(500).json({error: err.message});
    }
});

router.get('/', auth, async (req, res) => {
    const user = await User.findById(req.user);
    res.json({
        displayName: user.displayName,
        id: user._id
    });
});

module.exports = router;
