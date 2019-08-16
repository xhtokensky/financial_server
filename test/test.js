var moment = require('moment');


/*

let t2 = moment().add(5,'day').format('YYYY-MM-DD');

let end = 1564243200000;


console.log(moment(t2).valueOf())

let t = moment(1564243200000).add(2,'day').format('YYYY-MM-DD');
console.log(t)
let start = moment(t).valueOf();

console.log(Math.ceil((end-start)/(1000*60*60*24)))
*/

/*
var jwt = require('jsonwebtoken');


let token = jwt.sign({
    user_id: 111
}, 'test', { expiresIn: 30 });
console.log(token);



try {
    var decoded = jwt.verify(token, 'test');
    console.log(decoded)
} catch(err) {
    console.log(err.message)
    // err
}

*/

let crypto = require('crypto')

function encrypt(message) {
    let iv = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
        0x0e, 0x0f];
    let md5 = crypto.createHash('md5').update('tokensky').digest('hex');
    const cipher = crypto.createCipheriv(
        'aes-128-cbc',
        new Buffer(md5, 'hex'),
        new Buffer(iv)
    );
    var encrypted = cipher.update(message, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

function decrypt(message, key) {
    let iv = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
        0x0e, 0x0f];
    let md5 = crypto.createHash('md5').update('0102030405060708').digest('hex');
    const decipher = crypto.createDecipheriv(
        'aes-128-cbc',
        new Buffer(md5, 'hex'),
        new Buffer(iv)
    );
    var decrypted = decipher.update(message, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

//console.log(decrypt('YyWBNFfUEC4UX0teCvD/Vg=='))


let str = 'YyWBNFfUEC4UX0teCvD/+Vg==';
let e = encodeURIComponent(str)
console.log(e)

let d = decodeURIComponent(e);
console.log(d)


var decrypt2 = function (key, iv, message) {
    message = decodeURIComponent(message)
    console.log('m',message)
    //console.log(message)
    let crypted = new Buffer(message, 'base64').toString('binary');
    var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    var decoded = decipher.update(crypted, 'binary', 'utf8');
    decoded += decipher.final('utf8');
    return decoded;
};


//console.log(decrypt2('2019tokensky0000', '1112131415161718', 'RNGam90giygPKQ7Hx322Rg%3D%3D'))

var CryptoJS = require("crypto-js");

// Encrypt
var ciphertext = CryptoJS.AES.encrypt('my message', 'secret key 123');
console.log(ciphertext.toString())



var bytes  = CryptoJS.AES.decrypt(ciphertext.toString(), 'secret key 123');
var plaintext = bytes.toString(CryptoJS.enc.Utf8);
console.log(plaintext)


var decryptWithAes = function (message) {
    let iv = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
        0x0e, 0x0f];
    let key = 'tokensky_invite_12344321';
    let md5 = crypto.createHash('md5').update(key).digest('hex');
    const decipher = crypto.createDecipheriv(
        'aes-128-cbc',
        new Buffer(md5, 'hex'),
        new Buffer(iv)
    );
    var decrypted = decipher.update(message, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

//console.log(decryptWithAes(decodeURIComponent('zCeoM6PlM1IkE6D%2FeKUnDd5jx%2FG%2BywQujjeK5WZpYNw%3D')))

var arr = [500, 400, 320, 200, 1, 10, 8, 100, 130, 120, 135, 140, 180, 190, 170, -1, -2, -4]; // 原有数组
var targetNum = 125; // 目标数值
/**
 * @method
 * @author  gedesiwen
 * @param {array} arr 需要查找的数组
 * @param {number} num 目标数值，查找的是与这个数值最接近的
 * @return {number} 返回查找到的最接近的数值
 * @desc 获取数组中与目标数值最接近的数值
 */
function findCloseNum(arr, num) {
    var index = 0; // 保存最接近数值在数组中的索引
    var d_value = Number.MAX_VALUE; // 保存差值绝对值，默认为最大数值
    for (var i = 0; i < arr.length; i++) {
        var new_d_value = Math.abs(arr[i] - num); // 新差值
        if (new_d_value <= d_value) { // 如果新差值绝对值小于等于旧差值绝对值，保存新差值绝对值和索引
            if (new_d_value === d_value && arr[i] < arr[index]) { // 如果数组中两个数值跟目标数值差值一样，取大
                continue;
            }
            index = i;
            d_value = new_d_value;
        }
    }
    return arr[index] // 返回最接近的数值
}
//console.log(findCloseNum(arr, targetNum))

//admin/0/1564625458/WechatIMG4.png

let u = require('../app/utils/qiniu');

let config = {
    bucketName: "test1",
        accessKey: 'gPoNjxfS1qvYnbMjccy-UbOzvviIIeOSu5xqCPa7',
    secretKey: "_hcWP1rxzAYaa75KSQGFZulSqbGzTisv4j79vmTx",
    qiniuServer: 'http://test2.hardrole.com/'
};
console.log(u.getSignAfterUrl('admin/0/1564377699/WechatIMG1.png',config))

//0.00002790
console.log((0.00002790*10011.420*7*0.99/1.0536-1)*1);


//180 >> 0.8386537948966128
//360 >> 0.8372038940205011
console.log(72652.87*(1-0.002))
