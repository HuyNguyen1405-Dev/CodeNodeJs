import { getMessaging } from "firebase-admin/messaging";
import express from "express";
import cors from "cors";
import bodyParser from 'body-parser';
import mongoose from "mongoose";
import admin from "firebase-admin";

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

admin.initializeApp({
    credential: admin.credential.cert(credentialsPath),
    projectId: 'managementwork-6b9fc',
});

mongoose.connect('mongodb+srv://huynv14work:123@cluster0.euvsszg.mongodb.net/notification_app?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Đã kết nối với MongoDB Atlas');
    })
    .catch((error) => {
        console.error('Lỗi kết nối MongoDB Atlas:', error);
    });

// Định nghĩa schema cho collection "users"
const userSchema = new mongoose.Schema({
    name: String,
    token: String,
});

// Tạo model từ schema
const User = mongoose.model('User', userSchema);

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    cors({
        origin: "*",
    })
);

app.use(
    cors({
        methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    })
);

app.use(function (req, res, next) {
    res.setHeader("Content-Type", "application/json");
    next();
});

app.post("/saveInfoUser", function (req, res) {
    const username = req.body.username;
    const token = req.body.token;

    if (username && token) {
        User.findOne({ name: username })
            .then((existingUser) => {
                if (existingUser) {
                    // Username đã tồn tại, chỉ cập nhật token
                    existingUser.token = token;
                    return existingUser.save();
                } else {
                    // Tạo người dùng mới
                    const newUser = new User({
                        name: username,
                        token: token,
                    });
                    return newUser.save();
                }
            })
            .then(() => {
                res.status(200).json({
                    message: "User saved successfully",
                });
            })
            .catch((error) => {
                res.status(500).json({
                    message: "Error saving user",
                    error: error.message,
                });
            });
    } else {
        res.status(400).json({
            message: "Missing username or token_firebase",
        });
    }
});

app.post("/send", function (req, res) {

    const admin = req.body.admin_username;

    const title = req.body.title;

    const body = req.body.body;

    const type = req.body.type;

    const post_id = req.body.post_id;

    console.log(admin, title, body, type, post_id);

    User.findOne({ name: admin })
        .then((user) => {
            if (user) {
                const token_admin = user.token;

                if (title && body) {

                    const message = {
                        notification: {
                            title: title,
                            body: body,
                        },
                        data: {
                            type: type,
                            post_id: post_id,
                        },
                        token: token_admin
                    };

                    getMessaging()
                        .send(message)
                        .then((response) => {
                            res.status(200).json({
                                message: "Successfully sent message",
                                data: {
                                    post_id: post_id,
                                    type: type
                                }
                            });
                        })
                        .catch((error) => {
                            res.status(400);
                            res.send(error);
                            console.log("Error sending message:", error);
                        });
                } else {
                    res.status(400).json({
                        message: "Missing title or body",
                    });
                }
            } else {
                console.log('Không tìm thấy người dùng với admin_username:', admin);
            }
        })
        .catch((error) => {
            console.log('Lỗi tìm kiếm người dùng:', error);
        });

});

app.post("/sendNotificationToUser", function (req, res) {
    const users = req.body.username;
    const title = req.body.title;
    const body = req.body.body;

    if (!title || !body) {
        return res.status(400).json({
            message: "Missing title or body",
        });
    }

    User.find({ name: { $in: users } })
        .then((foundUsers) => {
            if (foundUsers.length === 0) {
                return res.status(400).json({
                    message: "No matching users found",
                });
            }

            const tokens = foundUsers.map((user) => user.token);

            const messages = tokens.map((token) => ({
                notification: {
                    title: title,
                    body: body,
                },
                token: token,
            }));

            Promise.all(
                messages.map((message) =>
                    getMessaging()
                        .send(message)
                        .catch((error) => {
                            console.log("Error sending message:", error);
                            return error;
                        })
                )
            )
                .then((responses) => {
                    res.status(200).json({
                        message: "Successfully sent messages",
                        responses: responses,
                    });
                })
                .catch((error) => {
                    res.status(400).json({
                        message: "Error sending messages",
                        error: error,
                    });
                });
        })
        .catch((error) => {
            console.log("Error finding users:", error);
            res.status(400).json({
                message: "Error finding users",
                error: error,
            });
        });
});

app.post("/sendMessageLoginSuccess", function (req, res) {
    try {
        let message = {
            notification: {
                title: "Đăng nhập thành công!",
                body: "Chào mừng bạn đã đến với ứng dụng đăng nhập.",
            },
            token: "dZVG_1YWRZSlEFRBXuly8p:APA91bEz9unTDJTaoUk2PXV7SVCOuBFu8uJGNnwAbUS0ig3cN4qIDFFLh2Sen3G17l93IarLWZHuPWfNSYZjC0puM3sCcmGyMcQTu5vBDr96eWUJKSJLMrdFk1IfR8TdgNk4M3H1gDSF",
        };

        getMessaging()
            .send(message)
            .then((response) => {
                if (response) {
                    return res.status(200).send({
                        message: "Gửi thông báo thành công"
                    });
                } else {
                    return res.status(500).send({
                        message: "Gửi thông báo thất bại"
                    });
                }
            })
            .catch((error) => {
                return res.status(500).send({
                    message: error
                });
            });
    } catch (error) {
        return res.status(500).send({
            message: error
        });
    }
});

app.listen(5000, function () {
    console.log("Server started on port 5000");
});

// $env:GOOGLE_APPLICATION_CREDENTIALS="C:/Users/vanhu/OneDrive/Documents/Trung tâm thông tin/my-express-project/managementwork-6b9fc-firebase-adminsdk-ng13m-ea9224edb1.json"

