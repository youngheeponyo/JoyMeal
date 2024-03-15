require("dotenv").config({
  path: "./db/db.env"
});
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your_secret_key';
const mysql = require("./db.js");
const bodyParser = require('body-parser');
const crypto = require('crypto'); //암호화
const express = require("express");
const app = express();
const axios = require("axios");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const server = require('http').createServer(app);
const session = require('express-session');
const sharedsession = require("express-socket.io-session");
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:8080",
  }
});



// const key1 = crypto.scryptSync('secret', 'salt', 64);
// console.log(key1.toString('hex')); 


let grade = ''

// JWT 토큰 생성
function generateToken(userId, userRole) {
  return jwt.sign({
    id: userId,
    role: userRole // 여기에 사용자 역할을 추가
  }, SECRET_KEY, {
    expiresIn: '1h' // 1시간 동안 유효한 토큰
  });
}


const expressSession = session({
  secret: 'what',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  } // HTTPS가 아닌 경우 false로 설정
});

app.use(expressSession);

io.use(sharedsession(expressSession, {
  autoSave: true
}));




app.use(express.json());
require('dotenv').config();
const {
  google
} = require('googleapis');
const nodemailer = require('nodemailer');

// OAuth2 클라이언트 설정
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_OAUTH_CLIENT_ID,
  process.env.GAMIL_OAUTH_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);


oauth2Client.setCredentials({
  refresh_token: process.env.GAMIL_OAUTH_REFRESH_TOKEN
});

// 액세스 토큰 생성
async function getAccessToken() {
  const {
    token
  } = await oauth2Client.getAccessToken();
  return token;
}


// 이메일 전송 함수
async function sendEmail(to, subject, body) {
  const accessToken = await getAccessToken();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_OAUTH_USER,
      accessToken,
      clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
      clientSecret: process.env.GAMIL_OAUTH_CLIENT_SECRET,
      refreshToken: process.env.GAMIL_OAUTH_REFRESH_TOKEN
    }
  });
  const mailOptions = {
    from: `yedam1 JOYMEAL <${process.env.GMAIL_OAUTH_USER}>`,
    to,
    subject,
    text: body
  };

  const result = await transporter.sendMail(mailOptions);
  return result;
}


server.listen(3000, () => {
  console.log('app대신 socket.io서버 on~~');
});


app.get("/test/:fileName", async (req, res) => {
  // 여기서 imagePath를 db에 저장하고 불러와야할듯...
  let fileName = req.params.fileName
  if (fileName == 'null') {
    fileName = 'noImg.jpg';
    console.log(fileName)
  }
  const imagePath = "uploads\\" + fileName;
  const absolutePath = path.join(__dirname, imagePath);
  console.log('경로1' + absolutePath)
  res.sendFile(absolutePath);
});

// 이메일 인증하기 버튼을 눌렀을때 이걸 axios실행시킨다.
// 그 밑에 인풋ㅎ태그가 보이면서 시간초 5분 준다. ==> 

app.post('/send-email', async (req, res) => {
  try {
    const {
      to, // 인풋태그에 있는 이메일값
      subject, // 1조 이메일 인증입니다.
      body // 글~~~ 이메일 인증 번호는 : 난수값 == 뷰에서 저장을 일단 해놈
    } = req.body;
    console.log(to + subject + body + '이메일콘솔');
    const result = await sendEmail(to, subject, body);
    res.status(200).send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
}); //이메일



//핸드폰인증
app.post('/phonecheck', async (req, res) => {
  const {
    to,
    from,
    text
  } = req.body.param;

  let data = req.body.param;
  console.log("본인인증을 위해 넘어온 데이터 = ", data);

  const coolsms = require('coolsms-node-sdk').default;
  async function printTokenResult(phone, token) {

    const messageService = new coolsms("NCSFCFI7TO43OVAC", "RIIYNSOEI8CXRA71EI47IOIV5YD9O6NC");
    
    const result = await messageService
      .sendOne({
        to,
        from,
        text
      })

    let checkresult = false; //'인증번호 발송 실패';
    console.log('핸드폰 인증 결과=', result);


    if (result.statusCode == '2000') {
      checkresult = true; //"인증번호 발송 성공";
    }
    console.log('checkresult=', checkresult);
    res.send(checkresult);
  }
  printTokenResult(data.phone, data.token);
}) //end 핸드폰인증 




//소켓
io.on('connect', (socket) => {
  console.log('소켓연결 on!')
  socket.on('joinRoom', (roomName) => {
    // 클라이언트를 해당 방에 조인시킵니다.
    socket.join(roomName);
    if (roomName == 'ADMIN') {
      console.log(`클라이언트가 ADMIN 방에 성공적으로 조인했습니다. 소켓 ID: ${socket.id}`);
    } else {
      console.log('뭔데? ㅡㅡ')
    }
  })

  socket.on('message', (message) => {
    console.log(message);
  });

  socket.on('authenticate', (token) => {

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        console.error('JWT verification failed:', err);
        io.close();
        return;
      }
      // 사용자 정보를 웹소켓 객체에 추가
      io.user = decoded;
      console.log(`WebSocket connected for user: ${decoded.id}`);
      console.log(`User role: ${decoded.role}`);
    })

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        console.error('JWT verification failed:', err);
        io.close();
        return;
      }
      // 사용자 정보를 웹소켓 객체에 추가
      io.user = decoded;
      console.log(`WebSocket connected for user: ${decoded.id}`);
      console.log(`User role: ${decoded.role}`);
    })


    socket.emit('connect2', '되나?')

    socket.emit('connect2', '되나?')

    socket.on('send', (one, two, three) => {
      console.log(one, two, three)
    })

    socket.on('report', (message) => {
      console.log(message);
    })

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

  })

  socket.on('report', (message) => {
    console.log(message);
  })

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

})


const cron = require("node-cron");


app.use(
  express.json({
    limit: "50mb",
  })
);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, new Date().valueOf() + path.basename(file.originalname));
  },
});

const upload = multer({
  storage: storage
});

app.post("/photos", upload.array("photos", 10), (req, res) => {
  let imgArray = new Array();
  for (let i = 0; i < req.files.length; i++) {
    imgArray.push(`${req.files[i].filename}`)
    console.log('현재 넘어온 사진 ' + req.files[i])
  }
  //let jsonImg = JSON.stringify(imgArray);
  res.send(imgArray);
});

app.post("/text", upload.array("text", 10), (req, res) => {
  let textArray = new Array();
  for (let i = 0; i < req.files.length; i++) {
    textArray.push(`${req.files[i].originalname}`)
    console.log('현재 넘어온 파일 ' + req.files[i])
  }
  res.send(textArray);
});

app.post("/photo", async (req, res) => {
  let data = req.body.param;
  let result = await mysql.query("admin", "insertFile", data)
  res.send(result);
});

app.get("/photo/:column/:pno", async (req, res) => {
  let data = [req.params.column, req.params.pno];
  let result = await mysql.query("admin", "photoList", data)
  res.send(result);
  console.log('실행' + result)
});

app.delete("/photo/:name", async (req, res) => {
  let data = req.params.name;
  let result = await mysql.query("admin", "delPhoto", data);
  console.log('삭제중' + result)
  res.send(result);
});

// app.delete("/photos", async (req, res) => {
//   console.log('삭제실행??')
//     try {
//       fs.unlinkSync(req.files);
//       console.log("image delete");
//     } catch (error) {
//       console.log(req.files)
//       console.log(error);
//     }
// }); //이미지 삭제 end


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
/* 
app.listen(3000, () => {
  console.log("재현 서버 on");
});
 */


//정적파일
app.use('/fileCall', express.static('uploads'));


app.get("/test/:fileName", async (req, res) => {
  // 여기서 imagePath를 db에 저장하고 불러와야할듯...
  let fileName = req.params.fileName
  if (fileName == 'null') {
    fileName = 'noImg.jpg';
    console.log(fileName)
  }
  console.log(req.params)
  const imagePath = "uploads\\" + fileName;
  const absolutePath = path.join(__dirname, imagePath);
  console.log('경로1' + absolutePath)
  res.sendFile(absolutePath);
});

// app.get("/test/uploads/:imagePath", async (req, res) => {
//   let data = req.params.imagePath;
//   console.log('여기까지 넘ㄴ어옴',data)
//   const absolutePath = path.join(__dirname,data);
//   console.log('경로2' + absolutePath)
//   res.sendFile(absolutePath);
// });

app.get("/show", async (req, res) => {
  let data = await mysql.query("test", "list");
  res.send(data);
});

app.get("/show/:no", async (req, res) => {
  let data = Number(req.params.no) * 6;
  let list = await mysql.query("test", "list2", data);
  res.send(list);
});

// 아임포트 액세스토큰 저장
app.get('/saveAccessToken', async (req, res) => {
  try {
    const getToken = await axios({
      url: 'https://api.iamport.kr/users/getToken',
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        imp_key: '1300467618678700', // REST API 키
        imp_secret: 'xQbiqzngwzGJ7JaeaSMfZ99DHYKOBFTKf5jn7aEU8dlyzvE2rxBb5jvwxG5eUAZcc8jGhpU4AZMNhhbk' // REST API Secret
      }
    });

    const accessToken = getToken.data.response.access_token;

    req.session.accessToken = accessToken; // 세션에 토큰 값을 저장

    res.send(accessToken);

  } catch (error) {
    console.error(error);
    res.status(500).send('토큰 저장 중에 에러가 발생했습니다.');
  }
});

app.post("/cancel", async (req, res, next) => {
  try {
    /* 결제정보 조회 */
    const {
      body
    } = req;

    console.log(body)
    // 클라이언트로부터 전달받은 주문번호, 환불사유, 환불금액
    const {
      merchant_uid,
      reason,
      cancel_request_amount,
      access_token
    } = body;

    console.log(merchant_uid, reason, cancel_request_amount, access_token, 'hi');
    /* 포트원 REST API로 결제환불 요청 */
    const getCancelData = await axios({
      url: "https://api.iamport.kr/payments/cancel",
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": access_token // 포트원 서버로부터 발급받은 엑세스 토큰
      },
      data: {
        merchant_uid: merchant_uid, // merchant_uid를 환불 `unique key`로 입력
        reason: reason, // 가맹점 클라이언트로부터 받은 환불사유
        amount: cancel_request_amount, // 가맹점 클라이언트로부터 받은 환불금액
      }
    });
    const {
      response
    } = getCancelData.data; // 환불 결과
    /* 환불 결과 동기화 */
  } catch (error) {
    res.status(400).send(error);
  }
})

app.get("/adddeliveryList", async (req, res) => { // 추가배송지
  let list = await mysql.query("test", "adddeliveryList", req.session.user_id);
  res.send(list);
});

app.get("/isolatedRegionList", async (req, res) => { // 배송불가 지역리스트
  let list = await mysql.query("test", "isolatedRegionList");
  res.send(list);
});

app.get("/couponList", async (req, res) => { // 쿠폰 리스트
  let list = await mysql.query("test", "couponList", req.session.user_id);
  res.send(list);
});

app.get("/couponUseList/:no", async (req, res) => { // 쿠폰 리스트
  let data = req.params.no
  let list = await mysql.query("test", "couponUseList", data);
  res.send(list);
});

app.get("/pointList", async (req, res) => { // 포인트 리스트 
  let list = await mysql.query("test", "pointList", req.session.user_id);
  res.send(list);
});

app.get("/cartList", async (req, res) => { //장바구니 리스트
  let userId = req.session.user_id;
  // if (!userId) { // user_id가 없을때
  //   return res.status(400).send('400에러~')
  // }

  try {
    let list = await mysql.query("test", "cartList", userId);
    res.send(list);
  } catch (err) { // db에서 뭐 오류뜨면~
    console.log(err);
    res.status(500).send({
      err: '서버에서 오류난듯?'
    })
  }
})

app.put("/CheckboxUpdate/:check/:no", async (req, res) => { // 장바구니 체크박스 선택시 업데이트
  let data = [req.params.check, req.params.no];
  let list = await mysql.query("test", "CheckboxUpdate", data);
  res.send(list);
});

app.put("/CheckAllUpdate/:check", async (req, res) => { // 체크박스 전체선택 업데이트
  let data = [req.params.check, req.session.user_id];
  let list = await mysql.query("test", "CheckAllUpdate", data);
  res.send(list);
});

// app.put("/CheckboxUpdate/:id", async (request, res) => { // 체크박스  업데이트
//   let cartList = request.body; // 배열

//같은 자바스크립트 이기 때문에 for문 사용가능
//   let list = 0;
//   for(let cart  of cartList){
//     let data = [cart.cart_checkbox, cart.cart_no];
//     list = await mysql.query("test", "CheckboxUpdate", data);
//   }

//   res.send(list);
// });


app.put("/Cartquantity/:no/:cno", async (req, res) => { // 장바구니에 담긴 상품의 재고가 빠져서 장바구니재고수정이필요한경우
  let data = [req.params.no, req.params.cno];
  let list = await mysql.query("test", "Cartquantity", data);
  res.send(list);
});

app.put("/CartPlusquantity/:pno", async (req, res) => { // 장바구니 수량 플러스
  let data = [req.params.pno, req.session.user_id];
  let list = await mysql.query("test", "CartPlusquantity", data);
  res.send(list);
});

app.put("/CartMinusquantity/:pno", async (req, res) => { // 장바구니 수량 마이너스
  let data = [req.params.pno, req.session.user_id];
  let list = await mysql.query("test", "CartMinusquantity", data);
  res.send(list);
});

app.put("/couponReturn/:no", async (req, res) => { // 취소했을때 쿠폰사용한 경우 다시 쿠폰을 돌려준다.
  let data = req.params.no;
  let list = await mysql.query("test", "couponReturn", data);
  res.send(list);
});

app.put("/pointReturn/:point", async (req, res) => { // 취소했을때 쿠폰사용한 경우 다시 쿠폰을 돌려준다.
  let data = [req.params.point, req.session.user_id];
  let list = await mysql.query("test", "pointReturn", data);
  res.send(list);
});

app.put("/StockReturn/:stock/:no", async (req, res) => { // 취소되면 다시 재고 수정
  let data = [req.params.stock, req.params.no];
  let list = await mysql.query("test", "StockReturn", data);
  res.send(list);
});

app.delete("/CheckboxDelete/:no", async (req, res) => { // 체크된 장바구니 삭제
  let data = req.params.no;
  let result = await mysql.query("test", 'CheckboxDelete', data);
  res.send(result);
});

app.get("/cartCheckList", async (req, res) => { //주문서의 장바구니체크된거만불러오는 리스트
  let list = await mysql.query("test", "cartCheckList", req.session.user_id);
  res.send(list);
});

app.get("/orderList/:no", async (req, res) => { // 주문완료 리스트
  let data = req.params.no;
  let list = await mysql.query("test", "orderList", data);
  res.send(list);
});

app.post("/orderInsert", async (request, res) => { // orders 등록
  let data = request.body.param;
  res.send((await mysql.query("test", "orderInsert", data)));
  io.to('ADMIN').emit('order', '새로운 결제가 있습니다.')
});

app.post("/orderdetailInsert", async (request, res) => { // order_detail 등록
  let data = request.body.param;
  res.send((await mysql.query("test", "orderdetailInsert", data)));
});

app.post("/pointInsert", async (request, res) => { // 포인트 사용내역 등록
  let data = request.body.param;
  res.send((await mysql.query("test", "pointInsert", data)));
});

app.put("/couponUpdate/:no", async (req, res) => { // 쿠폰 사용시 업데이트
  let data = [req.body.param, req.params.no];
  res.send((await mysql.query("test", "couponUpdate", data)));
});

app.put("/StockUpdate/:no", async (req, res) => { // 상품 재고변경
  let data = [req.body.param, req.params.no];
  res.send((await mysql.query("test", "StockUpdate", data)));
});

app.put("/pointUpdate", async (req, res) => { // 사용한 포인트 user테이블 업데이트
  let data = [req.body.param, req.session.user_id];
  res.send((await mysql.query("test", "pointUpdate", data)));
});

app.put("/orderUpdate/:no", async (req, res) => { // 취소되었을때 orders 주문상태 업데이트
  let data = req.params.no;
  res.send((await mysql.query("test", "orderUpdate", data)));
});


app.post("/refundInsert", async (request, res) => { // orders 등록
  let data = request.body.param;
  res.send((await mysql.query("test", "refundInsert", data)));
});


app.post("/joinCouponInsert", async (request, res) => { // 가입축하쿠폰 등록
  let data = request.body.param;
  res.send((await mysql.query("test", "joinCouponInsert", data)));
});

//서영희-회원관리
app.get("/user", async (req, res) => {
  let data = await mysql.query("admin", "AlluserList");
  res.send(data);
});

app.get("/user/:order/:startNo", async (req, res) => {
  let data = [req.params.order, Number(req.params.startNo) * 10];
  let list = await mysql.query("admin", "userList", data);
  res.send(list);
});

app.get("/searchuser/:id/:name/:order/:startNo", async (req, res) => {
  let list = [req.params.id, req.params.name, req.params.order, Number(req.params.startNo) * 10];
  let data = await mysql.query("admin", "searchUser", list);
  res.send(data);
});

app.get("/searchuser/:id/:name", async (req, res) => {
  let list = [req.params.id, req.params.name];
  let data = await mysql.query("admin", "AllsearchUser", list);
  res.send(data);
});

app.get("/user/:join/:order/:startNo", async (req, res) => {
  let list = [req.params.join, req.params.order, Number(req.params.startNo) * 10];
  let data = await mysql.query("admin", "filterUser", list);
  res.send(data);
});

app.get("/user/:join", async (req, res) => {
  let list = req.params.join;
  let data = await mysql.query("admin", "AllfilterUser", list);
  res.send(data);
});

app.get("/outUser", async (req, res) => {
  let data = await mysql.query("admin", "outList");
  res.send(data);
});

app.put("/user/:grade/:uid", async (req, res) => {
  let data = [req.params.grade, req.params.uid];
  let result = await mysql.query("admin", "stopUser", data);
  res.send(result);
});
//서영희-회원관리 여기까지

//서영희-상품관리
app.get("/prod/:name/:cate/:order/:startNo", async (req, res) => {
  let list = [req.params.name, req.params.cate, req.params.order, Number(req.params.startNo) * 10];
  let data = await mysql.query("admin", "searchProd", list);
  res.send(data);
});

app.get("/prod/:name/:cate", async (req, res) => {
  let list = [req.params.name, req.params.cate];
  let data = await mysql.query("admin", "AllsearchProd", list);
  res.send(data);
});

app.get("/prod", async (req, res) => {
  let data = await mysql.query("admin", "AllprodList");
  res.send(data);
});

app.get("/oprod/:order/:startNo", async (req, res) => {
  let datas = [req.params.order, Number(req.params.startNo) * 10];
  let list = await mysql.query("admin", "prodList", datas);
  res.send(list);
});

app.get("/oprod/:startNo", async (req, res) => {
  let datas = Number(req.params.startNo) * 10;
  let result = await mysql.query("admin", "pricehigh", datas);
  res.send(result);
});

app.get("/prods/:pno", async (req, res) => {
  let data = req.params.pno;
  let result = await mysql.query("admin", "prodInfo", data);
  res.send(result);
});

app.post("/prod", async (req, res) => {
  let data = req.body.param;
  let result = await mysql.query("admin", "prodInsert", data);
  res.send(result);
});

app.put("/prod/:pno", async (req, res) => {
  let datas = [req.body.param, req.params.pno];
  let result = await mysql.query("admin", "productMod", datas);
  res.send(result);
});

app.patch("/prod/:pno", async (req, res) => {
  let data = req.params.pno;
  let result = await mysql.query("admin", "prodDelete", data);
  res.send(result);
});
//서영희-상품관리 여기까지

//서영희-주문관리
app.get('/order', async (req, res) => {
  let result = await mysql.query("admin", "AllOrderList");
  res.send(result);
});

app.get('/order/:sno', async (req, res) => {
  let datas = Number(req.params.sno) * 10;
  let result = await mysql.query("admin", "orderList", datas);
  res.send(result);
});

app.get('/orders/:sday/:eday/:startNo', async (req, res) => {
  let datas = [req.params.sday, req.params.eday, Number(req.params.startNo) * 10];
  let result = await mysql.query("admin", "orderDate", datas);
  res.send(result);
});

app.get('/orders/:sday/:eday', async (req, res) => {
  let datas = [req.params.sday, req.params.eday];
  let result = await mysql.query("admin", "AllorderDate", datas);
  res.send(result);
});

app.get('/order/:status/:sno', async (req, res) => {
  let data = [req.params.status, Number(req.params.sno) * 10]
  let result = await mysql.query("admin", "orderStatus", data);
  res.send(result);
});

app.get('/orders/:status', async (req, res) => {
  let data = req.params.status;
  let result = await mysql.query("admin", "AllorderStatus", data);
  res.send(result);
});

app.get("/Oneorder/:ono", async (req, res) => {
  let data = req.params.ono;
  let list = await mysql.query("admin", "oneOrder", data);
  res.send(list);
  console.log(list)
});

app.get("/orderCount", async (req, res) => {
  //let data = req.params.orderNo;
  let list = await mysql.query("admin", "orderDetailCount");
  res.send(list);
});

app.put("/order/:status/:ono", async (req, res) => {
  let data = [req.params.status, req.params.ono];
  let list = await mysql.query("admin", "updateOrder", data);
  res.send(list);
});

app.post('/order/:ono/:tracking/:ono/:ono', async (req, res) => {
  let data = [req.params.ono, req.params.tracking, req.params.ono, req.params.ono];
  let result = await mysql.query("admin", "insertDelivery", data);
  res.send(result);
});
//서영희-주문관리 여기까지

//서영희-배송관련
app.get('/delivery', async (req, res) => {
  let result = await mysql.query("admin", "AlldeliveryList");
  res.send(result);
});

app.get('/delivery/:sno', async (req, res) => {
  let datas = Number(req.params.sno) * 10
  let result = await mysql.query("admin", "deliveryList", datas);
  res.send(result);
});

app.get('/deliveryf/:state/:startNo', async (req, res) => {
  let datas = [req.params.state, Number(req.params.startNo) * 10];
  let result = await mysql.query("admin", "StatedeliveryList", datas);
  res.send(result);
});

app.get('/deliveryf/:state', async (req, res) => {
  let datas = req.params.state;
  let result = await mysql.query("admin", "AllStatedeliveryList", datas);
  res.send(result);
});

app.get('/deliverys/:sday/:eday/:startNo', async (req, res) => {
  let datas = [req.params.sday, req.params.eday, Number(req.params.startNo) * 10];
  let result = await mysql.query("admin", "DatedeliveryList", datas);
  res.send(result);
  console.log('실행')
});

app.get('/deliverys/:sday/:eday', async (req, res) => {
  let datas = [req.params.sday, req.params.eday];
  let result = await mysql.query("admin", "AllDatedeliveryList", datas);
  res.send(result);
});

app.put('/delivery/:ono', async (req, res) => {
  let datas = req.params.ono;
  let result = await mysql.query("admin", "updateDelivery", datas);
  res.send(result);
});

app.post('/delivery/:ono/:uid/:ono/:save', async (req, res) => {
  let datas = [req.params.ono, req.params.uid, req.params.ono, Number(req.params.save)];
  let result = await mysql.query("admin", "insertPoint", datas);
  res.send(result);
});

app.put('/deliveryPoint/:point', async (req, res) => {
  let datas = Number(req.params.point);
  let result = await mysql.query("admin", "updatePoint", datas);
  res.send(result);
});

app.get('/getPoint/:ono', async (req, res) => {
  let datas = req.params.ono;
  let result = await mysql.query("admin", "selectPoint", datas);
  res.send(result);
});

app.get('/userInfo/:uid', async (req, res) => {
  let datas = req.params.uid;
  let result = await mysql.query("admin", "userInfo", datas);
  res.send(result);
});

app.post('/delivery/:ono/:uid/:ono/:save', async (req, res) => {
  let datas = [req.params.ono, req.params.uid, req.params.ono, Number(req.params.save)];
  let result = await mysql.query("admin", "insertPoint", datas);
  res.send(result);
});
//서영희-배송관련 여기까지

//여기 박현아

// 회원가입 - 아이디 중복체크용
app.get("/join-id/:id", async (req, res) => {
  let uid = req.params.id;
  let list = await mysql.query("user", "duplicateId", uid);
  res.send(list);
})


//회원가입 - 이메일 중복체크용
app.get("/join-email/:email", async (req, res) => {
  let uemail = req.params.email;
  console.log(uemail);
  let list = await mysql.query("user", "duplicateEmail", uemail);
  res.send(list);
  console.log(list);
})


//회원가입용(insert) 
app.post("/join/joinIn", async (req, res) => {
  let data = req.body.param;
  console.log('asdfsadfasdfsad')
  console.log(data);
  let pass = data.user_password
  console.log('이건 유저 비번 : ' + pass)
  let encData = crypto.createHash('sha512')
    .update(pass) //update(원본데이터)
    .digest('base64'); // digest : 64진수 - 표현방식 

  console.log('이건 암호화된 비번 : ' + encData);
  data.user_password = encData


  try {
    let result = await mysql.query("user", "joinIn", data);
    console.log('이건 결과 값 : ' + result)
    res.send(result);
  } catch {
    console.log(err);
    res.status(500).send({
      err: 'Database query failed'
    });
  }

});

//회원가입 > 가입축하쿠폰 지급하기 (z1)
app.post("/joincoupon", async(req, res) => {
  let data = req.body.param;
  let result = await mysql.query("user", "joinCoupon", data);
  res.send(result);
    console.log(result);
})


app.get('/logout', async (req, res) => {
  req.session.destroy();
})

//로그인 - 아이디비번 일치해야 로그인 (5회 오류시 보안프로그램실행)
app.post("/dologin", async (req, res) => {
  let data = [req.body.param.user_id, req.body.param.user_password];
  console.log(data)

  //암호화
  let encData = crypto.createHash('sha512')
    .update(data[1]) //update(원본데이터)
    .digest('base64'); // digest : 64진수 - 표현방식 

  data[1] = encData
  console.log(encData);

  let list = await mysql.query("user", "forLogin", data);
  if (list.length != 0) {
    req.session.user_id = req.body.param.user_id;
    req.session.user_grade = list[0].user_grade;
    // userGrade에 따라 role 설정
    const role = (req.session.user_grade == 'i4') ? 'admin' : 'user';
    // req.session.grade = 
    const token = generateToken(req.body.param.user_id, role);
    res.send({
      auth: true,
      token: token,
      user: list
    });
  } else {
    // 로그인 실패 응답 전송
    res.send({
      user: list
    });
  }
})

//카카오로그인 - 카카오아이디있는지 체크
app.get("/login/kakao/:id", async (req, res) => {
  let id = req.params.id;
  let list = await mysql.query("user", "checkKakao", id);
  console.log(list);
  res.send(list);
})

//putPass
app.get("/putpass/:id", async (req, res) => {
  let uid = req.params.id;
  let pass = await mysql.query("user", "putPass", uid);
  console.log(pass);

  res.send(pass);
})

//putPwd 
app.get("/putpwd/:id/:pass", async (req, res) => {
  let info = [req.params.id, req.params.pass]
  console.log(info);
  //암호화
  let encData = crypto.createHash('sha512')
    .update(info[1]) //update(원본데이터)
    .digest('base64'); // digest : 64진수 - 표현방식 

  info[1] = encData
  console.log('이게 암호와')
  console.log(encData);

  let putpass = await mysql.query("user", "putPwd", info);
  res.send(putpass);
  console.log(putpass);
})

//changePass
app.put("/changepass/:password/:id", async (req, res) => {
  let data = [req.params.password, req.params.id]
  console.log(data);
  //암호화
  let encData = crypto.createHash('sha512')
    .update(data[0]) //update(원본데이터)
    .digest('base64'); // digest : 64진수 - 표현방식 
  data[0] = encData

  let result = await mysql.query('user', 'changePass', data);
  res.send(result);
  console.log(result);

})


//아이디비번찾기
//아이디찾기
app.get("/find/findid/:name/:email", async (req, res) => {
  let data = [req.params.name, req.params.email]
  let list = await mysql.query("user", "findId", data);
  res.send(list);
})



//비번찾기
app.get("/find/findpass/:name/:email/:id", async (req, res) => {
  let data = [req.params.name, req.params.email, req.params.id]
  let list = await mysql.query("user", "findPass", data);
  console.log(list);
  res.send(list);
})


//회원수정
//일단 단건 데이터 불러오기
app.get("/selectid/:id", async (req, res) => {
  let uid = req.params.id;
  let list = await mysql.query("user", "selectId", uid);
  console.log(list)
  res.send(list);
})

//회원정보수정하기
app.put('/join/:id', async (req, res) => {
  let data = [req.body.param, req.params.id];

  let pass = data[0].user_password;
  console.log(pass);
  let encData = crypto.createHash('sha512')
    .update(pass) //update(원본데이터)
    .digest('base64'); // digest : 64진수 - 표현방식 

  data[0].user_password = encData
  console.log(data[0].user_password);

  let result = await mysql.query('user', 'updateUser', data);
  res.send(result);
});


//회원탈퇴하면 user id 뺴고 null로 수정해야됨
app.put("/updateoutuser/:id", async (req, res) => {
  let uid = req.params.id;
  let list = await mysql.query("user", "updateOutUser", uid);
  res.send(list);

})

//탈퇴한 애 탈퇴테이블에 담는거
app.post("/insertwithdrawal", async (req, res) => {
  let data = req.body.param;
  let result = await mysql.query("user", "insertWithdrawal", data);
  res.send(result);
})


app.get("/user", async (req, res) => {
  let list = await mysql.query("admin", "userList");
  res.send(list);
});




//서영희-통계
app.get("/sum", async (req, res) => {
  let result = await mysql.query("admin", "monthsIncome");
  res.send(result);
});

app.get("/weeksum/:agoweek/:week", async (req, res) => {
  let datas = [Number(req.params.agoweek), Number(req.params.week)]
  let result = await mysql.query("admin", "weekIncome", datas);
  res.send(result);
});

app.get("/counting", async (req, res) => {
  let result = await mysql.query("admin", "counting");
  res.send(result);
});

app.get("/outUser/:agoweek/:week", async (req, res) => {
  let datas = [Number(req.params.agoweek), Number(req.params.week)];
  let result = await mysql.query("admin", "outUserReason", datas);
  res.send(result);
});

app.get("/withMe/:outday/:joinday", async (req, res) => {
  let datas = [Number(req.params.outday), Number(req.params.joinday)]
  let result = await mysql.query("admin", "withUser", datas);
  res.send(result);
});

//서영희-공지사항
app.get("/notice", async (req, res) => {
  let result = await mysql.query("admin", "AllnoticeList");
  res.send(result);
});

app.get("/onenotice/:num", async (req, res) => {
  let data = req.params.num;
  let result = await mysql.query("admin", "Onenotice", data);
  res.send(result);
});

app.put("/onenotice/:num", async (req, res) => {
  let data = [req.body.param, req.params.num];
  let result = await mysql.query("admin", "OnenoticeUpdate", data);
  res.send(result);
});

app.post("/notice", async (req, res) => {
  let datas = req.body.param;
  let result = await mysql.query("admin", "insertNotice", datas);
  res.send(result);
});

app.get("/fnq/:column/:cate", async (req, res) => {
  let data = [req.params.column, req.params.cate];
  let result = await mysql.query("admin", "FNQList", data);
  res.send(result);
});

app.post("/fnq", async (req, res) => {
  let data = req.body.param;
  let result = await mysql.query("admin", "insertFNQ", data);
  res.send(result);
});

app.put("/fnq/:qno", async (req, res) => {
  let data = [req.body.param, req.params.qno];
  let result = await mysql.query("admin", "updateFNQ", data);
  res.send(result);
});

app.delete("/fnq/:qno", async (req, res) => {
  let data = req.params.qno;
  let result = await mysql.query("admin", "delFNQ", data);
  res.send(result);
});

app.get("/notice/:order/:sno/:lno", async (req, res) => {
  let data = [req.params.order, Number(req.params.sno), Number(req.params.lno)]
  let result = await mysql.query("admin", "AllnoticeList", data);
  res.send(result)
});

app.get("/notice/:import1/:import2/:order/:sno/:lno", async (req, res) => {
  let data = [req.params.import1, req.params.import2, req.params.order, Number(req.params.sno), Number(req.params.lno)];
  let result = await mysql.query("admin", "StateNoticeList", data);
  res.send(result)
});

app.get("/wordFilter/:first/:last/", async (req, res) => {
  let data = [req.params.first, req.params.last];
  let result = await mysql.query("test", "wordFilterPage", data);
  res.send(result)
})

app.get("/wordFilter/:first/:last/:col/:category", async (req, res) => {
  let data = [req.params.first, req.params.last, req.params.col, req.params.category];
  let result = await mysql.query("test", "categoryWordFilterPage", data);
  res.send(result)
})

app.get("/wordFilter/:first/:last/:no", async (req, res) => {
  let data = [req.params.first, req.params.last, Number(req.params.no) * 6];
  let result = await mysql.query("test", "wordFilter", data);
  res.send(result)
})

app.get("/wordFilter/:first/:last/:col/:category/:no", async (req, res) => {
  let data = [req.params.first, req.params.last, req.params.col, req.params.category, Number(req.params.no) * 6];

  let result = await mysql.query("test", "categoryWordFilter", data);
  res.send(result)
})

app.get("/priceFilter/:A/:B", async (req, res) => {
  let data = [Number(req.params.A), Number(req.params.B)];
  let result = await mysql.query("test", "priceFilterPage", data);
  res.send(result)
})

app.get("/priceFilter/:A/:B/:no", async (req, res) => {
  let data = [Number(req.params.A), Number(req.params.B), Number(req.params.no) * 6];
  let result = await mysql.query("test", "priceFilter", data);
  res.send(result)
})

app.get("/priceFilter/:A/:B/:col/:category", async (req, res) => {
  let data = [Number(req.params.A), Number(req.params.B), req.params.col, req.params.category];
  let result = await mysql.query("test", "categoryPriceFilterPage", data);
  res.send(result)
})

app.get("/priceFilter/:A/:B/:col/:category/:no", async (req, res) => {
  let data = [Number(req.params.A), Number(req.params.B), req.params.col, req.params.category, Number(req.params.no) * 6];
  let result = await mysql.query("test", "categoryPriceFilter", data);
  res.send(result)
})

app.get("/bothFilter/:first/:last/:A/:B", async (req, res) => {
  let data = [req.params.first, req.params.last, Number(req.params.A), Number(req.params.B)];
  let result = await mysql.query("test", "bothFilterPage", data);
  res.send(result)
})

app.get("/bothFilter/:first/:last/:A/:B/:no", async (req, res) => {
  let data = [req.params.first, req.params.last, Number(req.params.A), Number(req.params.B), Number(req.params.no) * 6];
  let result = await mysql.query("test", "bothFilter", data);
  res.send(result);
});

//서영희-리뷰
app.get('/review/:order', async (req, res) => {
  let data = req.params.order;
  let result = await mysql.query("admin", "reviewList2", data);
  res.send(result);
});
//서영희-신고된 리뷰처리
app.get('/report', async (req, res) => {
  let result = await mysql.query("admin", "AllreviewReportList");
  res.send(result);
});

app.get('/report/:sno', async (req, res) => {
  let datas = Number(req.params.sno) * 10;
  let result = await mysql.query("admin", "reviewReportList", datas);
  res.send(result);
});

app.get('/reports/:status', async (req, res) => {
  let datas = req.params.status;
  let result = await mysql.query("admin", "AllreasonReportList", datas);
  res.send(result);
});

app.get('/reports/:status/:sno', async (req, res) => {
  let datas = [req.params.status, Number(req.params.sno) * 10]
  let result = await mysql.query("admin", "reasonReportList", datas);
  res.send(result);
});

app.get('/Onereview/:rno', async (req, res) => {
  let datas = req.params.rno
  let result = await mysql.query("admin", "reviewInfo", datas);
  res.send(result);
})

app.put('/report/:state/:rno', async (req, res) => {
  let datas = [req.params.state, req.params.rno];
  let result = await mysql.query("admin", "updateReport", datas);
  res.send(result);
});

//서영희-환불관련
app.get('/refund', async (req, res) => {
  let result = await mysql.query("admin", "AllrefundOrderList");
  res.send(result);
});

app.get('/refund/:sno', async (req, res) => {
  let datas = Number(req.params.sno) * 10
  let result = await mysql.query("admin", "refundOrderList", datas);
  res.send(result);
});

app.get('/refunds/:state/:sno', async (req, res) => {
  let data = [req.params.state, Number(req.params.sno) * 10];
  let result = await mysql.query("admin", "refundState", data);
  res.send(result);
});

app.get('/refunds/:state', async (req, res) => {
  let data = req.params.state;
  let result = await mysql.query("admin", "AllrefundState", data);
  res.send(result);
});

app.put('/refund/:state/:date/:ono', async (req, res) => {
  let datas = [req.params.state, req.params.date, req.params.ono];
  let result = await mysql.query("admin", "updateRefund", datas);
  res.send(result);
});

app.post('/refund/:ono', async (req, res) => {
  let data = req.params.ono
  let result = await mysql.query("admin", "adminRefund", data);
  res.send(result);
});

app.put('/refund/:ono', async (req, res) => {
  let data = req.params.ono
  let result = await mysql.query("admin", "refundOrder", data);
  res.send(result);
});

//관리자-문의사항
app.get('/inquire', async (req, res) => {
  let result = await mysql.query("admin", "AllinquireList");
  res.send(result);
});

app.get('/inquire/:startNo', async (req, res) => {
  let datas = Number(req.params.startNo) * 10;
  let result = await mysql.query("admin", "inquireList", datas);
  res.send(result);
});

app.get('/inquire/:where1/:where2/:where3/:where4', async (req, res) => {
  let datas = [req.params.where1, req.params.where2, req.params.where3, req.params.where4];
  let result = await mysql.query("admin", "AllStateinquireList", datas);
  res.send(result);
});

app.get('/inquire/:where1/:where2/:where3/:where4/:startNo', async (req, res) => {
  let datas = [req.params.where1, req.params.where2, req.params.where3, req.params.where4, Number(req.params.startNo) * 10];
  let result = await mysql.query("admin", "StateinquireList", datas);
  res.send(result);
});

app.get('/inquires/:ino', async (req, res) => {
  let data = req.params.ino;
  let result = await mysql.query("admin", "inquireInfo", data);
  res.send(result);
});

app.put('/inquire/:ino', async (req, res) => {
  let data = req.params.ino;
  let result = await mysql.query("admin", "updateInquire", data);
  res.send(result);
});

app.post('/reply', async (req, res) => {
  let data = req.body.param;
  let result = await mysql.query("admin", "insertReply", data);
  res.send(result);
});
//문의사항 답변
app.get('/reply/:ino', async (req, res) => {
  let data = Number(req.params.ino);
  let result = await mysql.query("admin", "replyInfo", data);
  res.send(result);
});


app.get("/bothFilter/:first/:last/:A/:B/:col/:category", async (req, res) => {
  let data = [req.params.first, req.params.last, Number(req.params.A), Number(req.params.B), req.params.col, req.params.category];
  let result = await mysql.query("test", "categoryBothFilterPage", data);
  res.send(result);
});

app.get("/bothFilter/:first/:last/:A/:B/:col/:category/:no", async (req, res) => {
  let data = [req.params.first, req.params.last, Number(req.params.A), Number(req.params.B), req.params.col, req.params.category, Number(req.params.no) * 6];
  let result = await mysql.query("test", "categoryBothFilter", data);
  res.send(result)
})

app.get("/show/:col/:category/:no", async (req, res) => {

  let data = [req.params.col];
  if (req.params.category == 'all') {
    let test = `select file_name, p.*, format(avg(review_grade),1) AS 'star' from product p left join order_detail d on p.prod_no = d.prod_no
    left join review r  on r.detail_order_no = d.order_detail_no left join (select file_name,prod_no from file where orders='s0') f on(p.prod_no = f.prod_no) group by p.prod_no limit ? , 6`
    let data = []
    data.push(Number(req.params.no) * 6);
    let result = await mysql.query2(test, data);
    res.send(result)


  } else {
    data.push(req.params.category, Number(req.params.no) * 6)
    let result = await mysql.query("test", "categoryList", data);
    res.send(result)
  }
})

app.get("/show/:col/:category/", async (req, res) => {
  let data = [req.params.col];
  if (req.params.category == 'all') {
    let test = `select file_name, p.*, format(avg(review_grade),1) AS 'star' from product p left join order_detail d on p.prod_no = d.prod_no
    left join review r  on r.detail_order_no = d.order_detail_no left join (select file_name,prod_no from file where orders='s0') f on(p.prod_no = f.prod_no) group by p.prod_no`
    let result = await mysql.query2(test, data);
    res.send(result)


  } else {
    data.push(req.params.category)
    let result = await mysql.query("test", "categoryListPage", data);
    res.send(result)
  }
})

app.get("/new/:no", async (req, res) => {
  let data = Number(req.params.no);
  let result = await mysql.query("test", "newList", data);
  res.send(result);
})

app.get("/new", async (req, res) => {
  let result = await mysql.query("test", "newListPage");
  res.send(result);
})


//예빈
//멤버정보

app.get("/member/:id", async (req, res) => {
  let id = req.params.id;
  console.log('파람아이디' + id)
  let memberInfo = (await mysql.query("member", "memberInfo", id))[0]; // 데이터 타입 :  객체  
  let pointInfo = (await mysql.query("point", "showNextMonth", id))[0]; // 데이터 타입 : 숫자
  memberInfo.showNextMonth = pointInfo;

  res.send(memberInfo);
})
app.get("/userGrade", async (req, res) => {
  let grade = (await mysql.query("member", "memberState"))
  res.send(grade)
})
// //다음달 소멸 포인트
// app.get("/nextMonthPoint/:id", async(req,res)=>{
//   let id = req.params.id;
//   res.send(await mysql.query("point", "showNextMonth", id))[0]
// });

//상세페이지 정보
app.get("/detailPro/:pno", async (req, res) => {
  let pno = req.params.pno;
  let info = await mysql.query('orders', 'detailInfo', pno);
  res.send(info);
})
app.get("/detailProd/:pno", async (req, res) => {
  let pno = req.params.pno;
  let info = await mysql.query('orders', 'detailInfoImage', pno);
  res.send(info);
})


//상세페이지-> 장바구니
app.post("/savingCart", async (req, res) => {
  let data = req.body.param;
  let result = await mysql.query('orders', 'savingCart', data);
  res.send(result);
})
app.put("/updateCart/:pno", async (req, res) => {
  let datas = [req.body.param, req.params.pno, req.session.user_id];
  let result = await mysql.query('orders', 'updateCart', datas);
  res.send(result);
})
//장바구니 넣을시 추가할지 업데이트할지
app.get("/comparisonCart", async (req, res) => {
  let id = req.session.user_id;
  let result = await mysql.query('orders', 'comparisonCart', id);
  res.send(result)
})




//주문내역 관련
app.get("/myOrders", async (req, res) => {
  let id = req.session.user_id
  let lists = await mysql.query('orders', 'orderList', id);
  //let list = await mysql.query('orders', 'orderList', id);
  // 가공
  //let list = await getOrderInfos(id);
  res.send(lists);
});

// async function getOrderInfos(id){
//   let lists = await mysql.query('orders', 'orderList', id); // group_concat 사용 쿼리

//   let newList = list.map((info)=>{
//     let tempList = info.prod_name_list.split(',');
//     let newData = `${tempList[0]} 외 ${tempList.length-1}건`;
//     info.prod_name_list = newData;
//     return info;
//   })
//   return newList;
// }
app.get("/myOrdersName/:ono", async (req, res) => {
  let datas = [Number(req.params.ono), req.session.user_id]
  let info = await mysql.query('orders', 'orderListCount', datas);
  res.send(info);
})
//주문 상세내역
app.get("/myDetailOrders/:ono", async (req, res) => {
  let datas = [Number(req.params.ono), req.session.user_id]
  let list = await mysql.query('orders', 'detailOrderLists', datas);
  res.send(list);
})
//-주문취소
app.delete('/orders/:ono', async (req, res) => {
  let datas = [req.body.param.order_status, req.params[ono], req.session.user_id];
  let result = await mysql.query('orders', 'orderCancle', datas)
  res.send(result)
})



//추가 배송지 관련
app.get('/addDelivery', async (req, res) => {
  let id = [req.session.user_id]
  const list = await mysql.query('delivery', 'deliveryList', id);
  res.send(list);
})
app.get("/deliveryInfo/:dno", async (req, res) => {
  let datas = Number(req.params.dno)
  let result = await mysql.query('delivery', 'deliveryInfo', datas)[0];
  res.send(result)
})
app.get("/deliveryBasic/:id", async (req, res) => {
  let id = req.params.id
  let result = await mysql.query('delivery', 'deliveryUser', id);
  res.send(result)
})
//배송지정보수정
app.put("/updateDelivery/:dno", async (req, res) => {
  let datas = [req.body.param, req.params[dno]]
  let result = await mysql.query('delivery', 'updateDelivery', datas);
  res.send(result)
})

//정보삽입
app.post("/addDelivery", async (req, res) => {
  let datas = req.body.param
  let result = await mysql.query('delivery', 'addDelivery', datas)
  res.send(result);
})
app.delete("/delDelivery/:dno", async (req, res) => {
  let dno = req.params.dno
  let result = await mysql.query('delivery', 'deleteDelivery', dno)
  res.send(result);
})
//찜하기 리스트
app.get("/like", async (req, res) => {
  let id = req.session.user_id;
  let list = await mysql.query('like', "likeList", id)
  res.send(list);
})
//쿠폰
app.get("/myCoupon", async (req, res) => {
  let id = req.session.user_id;
  let list = await mysql.query('coupon', 'myCoupon', id)
  res.send(list);
})

app.get("/user", async (req, res) => {
  let list = await mysql.query("admin", "userList");
  res.send(list);
});



//포인트
//기간 만료시 포인트 소멸인거처럼 업데이트 
//둘다 된다 await를 거는게 더 좋은걸까..?
cron.schedule("0 0 0 * * *", async () => {
  //updatePoint();
  await mysql.query("point", 'pointExpire', (err, result) => {
    if (err) {
      console.log(err)
    } else {
      console.log(`테이블 업데이트 성공`)
    }
  })
});

//     cron.schedule("0 0 0 * * *", ()=>{
//     updatePoint()
//   })
//   function updatePoint(){
//     mysql.query("point", 'pointExpire',(err,result)=>{
//      if(err){
//        console.log(err)
//      }else{
//        console.log(`테이블 업데이트 성공`)
//      }
//    })
//  }
//마이페이지 포인트 내역조회
app.get("/myPointSave", async (req, res) => {
  let id = req.session.user_id;
  let list = await mysql.query("point", "myPointSaveHistory", id);
  res.send(list);
});
app.get("/myPointUse", async (req, res) => {
  let id = req.session.user_id;
  let list = await mysql.query("point", "myPointUseHistory", id);
  res.send(list);
})
//리뷰등록,삭제시 포인트 관련
app.post("/reviewPoint", async (req, res) => {
  //let datas = [request.body.param,Number(req.params.ono),req.params.id]
  let datas = [req.body.param.point_no, req.body.param.order_detail_no, req.session.user_id]
  res.send(await mysql.query("point", "reviewPoint", datas));;

});
app.put("reviewPointUp", async (req, res) => {
  let id = req.session.user_id
  res.send(await mysql.query("point", "reviewPointUp", id))
})
// app.post("/deleteRPoint", async ( req,res)=>{
//   let data = req.body.param
//   res.send(await mysql.query("point", "reviewPointD",data))

// })

// app.put("reviewPointDown", async (req,res)=>{
//   let id = req.session.user_id
//   res.send(await mysql.query("point", "reviewPointDown", id))
// })





//리뷰관련
//상세페이지에서 리뷰목록
app.get("/detailReview/:pno", async (request, response) => {
  let pno = request.params.pno
  let list = await mysql.query('reviews', 'detailList', pno)
  response.send(list);
})
//마이페이지에서 리뷰목록
app.get("/myReviews/:limit", async (request, response) => {
  let id = [request.session.user_id,Number(request.params.limit)]
  let list = await mysql.query('reviews', 'myReview', id)
  response.send(list);
})
app.get("/myReviews", async (request, response) => {
  let id = request.session.user_id
  let list = await mysql.query('reviews', 'AllmyReview', id)
  response.send(list);
})
//리뷰등록 + (포인트 지급은 위에 참고)
app.post("/reviewInsert", async (req, res) => {
  let datas = req.body.param
  res.send(await mysql.query("reviews", "insertReview", datas));

});
//리뷰 단건 조회
app.get("/myReview/:rno", async (req, res) => {
  let datas = [req.session.user_id, req.params.rno]
  res.send(await mysql.query("reviews", "reviewInfo", datas))
});
//상품 리뷰 받아옥(서여으히)
app.get("/reviewList/:pno", async (req, res) => {
  let datas = req.params.pno;
  res.send(await mysql.query("reviews", "reviewList", datas));
});

app.put("/likeUp/:rno", async (req, res) => {
  let datas = req.params.rno;
  res.send(await mysql.query("reviews", "likeUp", datas));
});
app.put("/likeDown/:rno", async (req, res) => {
  let datas = req.params.rno;
  res.send(await mysql.query("reviews", "likeDown", datas));
});

//리뷰수정
app.put("/reviewUpdate/:rno", async (req, res) => {
  let datas = [req.body.param, req.session.user_id, Number(req.params.rno)]
  res.send(await mysql.query("reviews", "updateReview", datas));
})
app.delete("/deleteReview/:rno", async (req, res) => {
    let rno = req.params.rno
    let result = await mysql.query('reviews', 'deleteReview', rno)
    res.send(result);
  }),
  app.get("/rLikeCnt/:user/:rno", async (req, res) => {
    let datas = [req.params.user, req.params.rno]
    let result = await mysql.query("reviews", "selectReviewLike", datas)
    res.send(result);
    console.log(result)
  })

app.post("/reviewLike/:rno/:uid", async (req, res) => {
  let data = [Number(req.params.rno), req.params.uid]
  res.send(await mysql.query("reviews", "insertReviewLike", data))
});

app.delete("/reviewLike/:rno/:uid", async (req, res) => {
  let datas = [req.params.rno, req.params.uid]
  res.send(await mysql.query("reviews", "deleteReviewLike", datas))
})
//상세페이지 버튼 disable용
app.get("/orderNoReview", async (req, res) => {
  let id = req.session.user_id
  res.send(await mysql.query("reviews", "orderNoReview", id))
});





//찜하기
app.delete("/DelprodLike/:id/:pno", async (req, res) => {
  console.log('????');
  let datas = [req.params.id, req.params.pno]
  console.log(datas);
  res.send(await mysql.query("like", "likeDel", datas))
});

app.get("/prodLike/:id/:pno", async (req, res) => {
  let datas = [req.params.id, Number(req.params.pno)]
  console.log(datas)
  let aa = await mysql.query("like", "likeInfo", datas)
  res.send(aa)
});

app.get("/prodLikes", async (req, res) => {
  let id = req.session.user_id
  res.send(await mysql.query("like", "likeList", id))
});

app.post("/prodLike", async (req, res) => {
  let data = req.body.param
  res.send(await mysql.query("like", "likeInsert", data))
});




//문의하기
app.get("/myInquire/:id", async (req, res) => {
  let id = req.params.id;
  res.send(await mysql.query("inquire", "myInquireList", id))
})
app.get("/Myinquires/:ino", async (req, res) => {
  let ino = req.params.ino;
  res.send(await mysql.query("inquire", "inquireInfo2", ino))
})
app.post("/inquire", async (req, res) => {
  let data = req.body.param
  res.send(await mysql.query("inquire", "inquireInsert", data))
})
app.put("/inquireUpdate/:ino", async (req, res) => {
  let datas = [req.body.param, req.session.user_id, req.params.ino]
  res.send(await mysql.query("inquire", "inquireUpdate", datas))
})
app.delete('/deleteInquire/:ino', async (req, res) => {
  let ino = req.params.ino;
  let result = await mysql.query("inquire", "deleteInquire", ino)
  res.send(result)
})
app.get("/inquireP/:pno", async (req, res) => {
  let pno = Number(req.params.pno)
  res.send(await mysql.query("inquire", "inquireListP", pno))
})

//답변
app.get("/inquireAnswer/:ino", async (req, res) => {
  let ino = Number(req.params.ino);
  res.send(await mysql.query("inquire", "inquireAnswer", ino))
})

app.get("/photoInq/:ino", async (req, res) => {
  let ino = req.params.ino
  res.send(await mysql.query("inquire", "photoListInq", ino))
})

//공지사항, fnq
app.get("/notice", async (req, res) => {
  res.send(await mysql.query("notice", "noticeList"))
})
app.get("/Mynotice/:nno", async (req, res) => {
  let nno = Number(req.params.nno);
  res.send(await mysql.query("notice", "noticeInfo", nno))
})
app.get("/fnq", async (req, res) => {
  res.send(await mysql.query("fnq", "fnqList"))
})
app.get("/fnqInfo/:fno", async (req, res) => {
  let fno = req.params.fno
  res.send(await mysql.query("fnq", "fnqInfo",fno));
  console.log('현재 : ',fno)
})





















app.get("/frozen/:first/:last/:A/:B/:no", async (req, res) => {
  let base = `select file_name, p.*, FORMAT(avg(review_grade),1) AS 'star' from product p left join order_detail d on p.prod_no = d.prod_no
  left join review r  on r.detail_order_no = d.order_detail_no   left join (select file_name,prod_no from file where orders='s0') f on(p.prod_no = f.prod_no)  where refrigeration = 'g1' `

  let params = [];

  const {
    no,
    first,
    last,
    A,
    B
  } = req.params;

  if (first !== 'X' && last !== 'X') {
    base += ` AND prod_name >= ? AND prod_name < ?`;
    params.push(first, last);
  }
  if (A !== 'X' && B !== 'X') {
    base += ` AND discount_price BETWEEN ? AND ?`;
    params.push(Number(A), Number(B));
  }

  base += ` group by p.prod_no `

  if (no !== 'X') {
    base += ` LIMIT ?, 6`;
    params.push(Number(no) * 6);
  }
  let result = await mysql.query2(base, params);
  res.send(result);
})



app.get("/searchHeader/:word/:no", async (req, res) => {
  let word = [req.params.word, Number(req.params.no)];
  let list = await mysql.query('test', 'searchHeader', word)
  res.send(list);

})

app.get('/sockettest', async (req, res) => {
  io.emit('test', '알람테스트3')
})

app.get("/searchHeader/:word", async (req, res) => {
  let data = req.params.word
  let list = await mysql.query('test', 'searchHeaderPage', data)
  res.send(list)
})

app.post("/cartAfterLogin", async (req, res) => {
  let data = req.body.param;
  let list = await mysql.query('test', 'cartAfterLogin', data)
  res.send(list);
})

app.put(`/cartAfterLogin/:no`, async (req, res) => {
  let data = [req.body.param, req.params.no];
  let list = await mysql.query('test', 'cartUpdate', data)
  res.send(list)
})

app.get(`/cartSelect/:no/:id`, async (req, res) => {
  let data = [Number(req.params.no), req.params.id];
  let list = await mysql.query('test', 'cartSelect', data)
  res.send(list)
})

app.get('/cart', async (req, res) => {

  res.send(await mysql.query('test', 'cartList', req.session.user_id))
})


app.get(`/best`, async (req, res) => {
  const {
    no,
    first,
    last,
    A,
    B,
  } = req.query;


  let base = `SELECT file_name, p.*, COUNT(*) AS hotItem, FORMAT(AVG(r.review_grade), 1) AS avg_grade
  FROM order_detail o 
  LEFT JOIN product p ON o.prod_no = p.prod_no
  LEFT JOIN review r ON r.detail_order_no = o.order_detail_no
  left join (select file_name,prod_no from file where orders='s0') f on(p.prod_no = f.prod_no) 
  WHERE 1=1  `

  if (first && last) {
    base += ` and prod_name >= '${first}' and prod_name < '${last}'`
  }

  if (A && B) {
    base += ` and discount_price between ${A} and ${B} `
  }

  base += ` GROUP BY p.prod_no HAVING hotItem > 1 and avg_grade > 4 ORDER BY hotItem DESC`

  if (no) {
    base += ' limit ' + no * 6 + ' , 6';
  }
  let result = await mysql.query2(base);
  res.send(result);
});
app.get(`/sale`, async (req, res) => {
  const {
    no,
    first,
    last,
    A,
    B,
  } = req.query;


  let base = `select file_name, p.*, FORMAT(AVG(r.review_grade), 1) AS avg_grade
  FROM product p 
  LEFT JOIN order_detail o ON o.prod_no = p.prod_no
  LEFT JOIN review r ON r.detail_order_no = o.order_detail_no
  left join (select file_name,prod_no from file where orders='s0') f on(p.prod_no = f.prod_no)
  where discount_rate > 40`

  if (first && last) {
    base += ` and prod_name >= '${first}' and prod_name < '${last}'`
  }

  if (A && B) {
    base += ` and discount_price between ${A} and ${B} `
  }

  base += ` group by p.prod_no`
  if (no) {
    base += ' limit ' + no * 6 + ' , 6';
  }
  let result = await mysql.query2(base);
  res.send(result);
})


// sql injection의 위험이 있음 처리해야함;;
app.get("/new2/:first/:last/:A/:B/:no", async (req, res) => {
  let base = `select file_name, p.*, format(avg(review_grade),1) AS 'star' from product p left join order_detail d on p.prod_no = d.prod_no
left join review r  on r.detail_order_no = d.order_detail_no left join (select file_name,prod_no from file where orders='s0') f on(p.prod_no = f.prod_no)  WHERE p.registration >= CURRENT_DATE() - INTERVAL 7 DAY `;
  let no = req.params.no;
  let first = req.params.first;
  let last = req.params.last;
  let A = req.params.A;
  let B = req.params.B;
  if (first != 'X' && last != 'X') {
    base += ` and  prod_name >= '${first}' and prod_name < '${last}'`;
  }
  if (A != 'X' && B != 'X') {
    base += ` and discount_price between ${A} and ${B} `
  }
  base += ` group by p.prod_no`

  if (no != 'X') { // 2번째가 X라면 전체페이지, 아니면 6페이지씩
    base += ' limit ' + no * 6 + ', 6';
  }
  let result = await mysql.query2(base);
  res.send(result);
})

app.get('/sessiontest', (req, res) => {
  res.send(grade)
  console.log('=!=')
  console.log(grade)
  console.log('=!=')
})

app.get('/mainreview',
  async (req, res) => {
    res.send(await mysql.query('test', 'mainReview'))
  })

app.post('/reviewreport', async (req, res) => {
  let data = req.body.param
  let query = `insert into review_report set ?`
  let result = await mysql.query2(query, data)

  io.to('ADMIN').emit('report', '새로운 신고요청건이 있습니다.')
  res.send(result);

})
app.put('/reviewreport/:rno', async (req, res) => {
  let query = `update review set report_cnt = report_cnt + 1 where review_no = ?`
  let data = req.params.rno;
  let result = await mysql.query2(query, data)
  res.send(result)
})

app.get('/reviewreport/:rno', async (req, res) => {
  let query = `select * from review_report where user_id = ? and review_no = ?`
  let data = [req.session.user_id, Number(req.params.rno)]
  res.send(await mysql.query2(query, data))
})

app.get('/mainbest', async (req, res) => {
  res.send(await mysql.query2(`select file_name, p.*, format(avg(review_grade),1) AS 'star' from product p 
  left join order_detail d on p.prod_no = d.prod_no
  left join review r  on r.detail_order_no = d.order_detail_no 
  left join (select file_name,prod_no from file where orders='s0') f on(p.prod_no = f.prod_no) 
  where p.stock > 0 group by p.prod_no order by count(d.prod_no) desc limit 0 , 6;`))
})