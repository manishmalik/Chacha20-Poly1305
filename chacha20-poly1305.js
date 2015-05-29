/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  ChaCha20-Poly1305 implementation in JavaScript                							  	  */
/*	(c) Manish Malik  2015	/ MIT Licence	  													  */
/*                                                                                                */
/*  - Reference																					  */
/*			 https://www.rfc-editor.org/rfc/rfc7539.txt											  */
/*																								  */
/*	In this implementation I have used : 														  */
/*	JavaScript BigInteger library version 0.9 Copyright (c) 2009 Matthew Crumley				  */
/*	https://github.com/silentmatt/javascript-biginteger-master									  */
/*	for dealing with big integer arithmetics									                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

chacha={};

function quater_round(chacha){
	/* All the additions are Modulo base 2^32 */
	/* >>>0 , is used to make unsigned int */
	/* a+=b; d^=a; d<<<=16; */
	chacha.a=((chacha.a +chacha.b) & 0xffffffff) >>>0;
	chacha.d^=chacha.a;
	/* 16 bits left Rotation toward high bits */
	chacha.d=((chacha.d << 16) | (chacha.d >>> (32-16))) >>>0;
	/* c+=d; b^=c; b<<<12; */
	chacha.c=((chacha.c +chacha.d) & 0xffffffff) >>>0;
	chacha.b^=chacha.c;
	chacha.b=((chacha.b << 12) | (chacha.b >>> (32-12))) >>>0;
	/* a+=b;d^=a; d<<<8; */
	chacha.a=((chacha.a +chacha.b) & 0xffffffff) >>>0;
	chacha.d^=chacha.a;
	chacha.d=((chacha.d << 8) | (chacha.d >>> (32-8))) >>>0;
	/* c+=d; b^=c; b<<<7; */
	chacha.c=((chacha.c +chacha.d) & 0xffffffff) >>>0;
	chacha.b^=chacha.c;
	chacha.b=((chacha.b << 7) | (chacha.b >>> (32-7))) >>>0;
	/* converting back to Hex */
	chacha.a=chacha.a.toString(16);
	chacha.b=chacha.b.toString(16);
	chacha.c=chacha.c.toString(16);
	chacha.d=chacha.d.toString(16);
}

function test_quater_round(chacha){
	chacha.a= 0x11111111;
	chacha.b= 0x1020304;
	chacha.c= 0x9b8d6f43;
	chacha.d= 0x1234567;

	console.log(chacha);

	quater_round(chacha);

	console.log(chacha);
}

/* Apply the Quater Round on the elements in the matrix(word) at x,y,z,w positions 
	@param {object}chacha : Global object containing the word list of hex values
	@param {num} x,y,z,w  : position where quater round is applied  
	update chacha.word after applying the quater_round()
*/
function quater_round_state(chacha,x,y,z,w)
{
	chacha.a=chacha.word[x];
	chacha.b=chacha.word[y];
	chacha.c=chacha.word[z];
	chacha.d=chacha.word[w];
	
	quater_round(chacha);

	chacha.word[x]=parseInt(chacha.a,16);
	chacha.word[y]=parseInt(chacha.b,16);
	chacha.word[z]=parseInt(chacha.c,16);
	chacha.word[w]=parseInt(chacha.d,16);
}

function test_quater_round_state(chacha)
{
	chacha.word= new Array(16);
	chacha.word = [
		0x879531e0  ,0xc5ecf37d,  0x516461b1,  0xc9a62f8a
       ,0x44c20ef3  ,0x3390af7f,  0xd9fc690b,  0x2a5f714c
       ,0x53372767  ,0xb00a5631,  0x974c541a,  0x359e9963
       ,0x5c971061  ,0x3d631689,  0x2098d9d6,  0x91dbd320];
    
    for( var i=0 ; i+3<16 ;i+=4)
    {
		console.log(chacha.word[i].toString(16) + "   "+chacha.word[i+1].toString(16) + "   "+chacha.word[i+2].toString(16) + "   "+chacha.word[i+3].toString(16));
    }

    quater_round_state(chacha,2,7,8,13);

    console.log("\n");
    for( var i=0 ; i+3<16 ;i+=4)
    {
		console.log(chacha.word[i].toString(16) + "   "+chacha.word[i+1].toString(16) + "   "+chacha.word[i+2].toString(16) + "   "+chacha.word[i+3].toString(16));
    }
}

/* Converting Serialize to Unserialized form 
	@param  {string} input : serialized input array
	@returns {string} 		: in little-endian order */
function unserialized(input)
{
	input=input.split(":");
	matrix=[];
	for(var i=0; i<input.length;i+=4)
	{
		temp="0x"+input[i+3]+input[i+2]+input[i+1]+input[i];
		temp=parseInt(temp,16);
		temp=temp.toString(16);
		matrix[i/4]=temp;
	}
	return matrix;
}
/* Converting to Serialized keystream
	@param {array} input : Array of states in the hex forms
	@returns {array)	  : Keystream in hex form
*/
function serialized(input)
{
	keystream=[];
	var k=0;
	for(var i=0;i<input.length;i++)
	{
		if((input[i].toString(16)).length%2==0)
		{
			temp=input[i].toString(16);
			for(var j=temp.length - 1;j-1>=0;j-=2)
			{
				h=temp[j-1] +temp[j];
				keystream[k]=parseInt(h,16);
				k++;
			}
		}
		else
		{
			temp=input[i].toString(16);
			msb="0"+temp[0];
			for(var j=temp.length-1;j-1>=1;j-=2)
			{
				h=temp[j-1]+temp[j];
				keystream[k]=parseInt(h,16);
				k++;
			}
			keystream[k]=parseInt(msb,16);
			k++;
		}
	}
	return keystream;
}
/* ChaCha20 Block Function where the words are arranged as: 
			cccccccc  cccccccc  cccccccc  cccccccc
			kkkkkkkk  kkkkkkkk  kkkkkkkk  kkkkkkkk
			kkkkkkkk  kkkkkkkk  kkkkkkkk  kkkkkkkk
			bbbbbbbb  nnnnnnnn  nnnnnnnn  nnnnnnnn
	where c: constant as defined in RFC 7539, k: key, b: block count, n: nonce 
@param {Object} chacha  : Main object
@param {String} key     : Key in string format "xx:xx:xx" 256 bits
@param {Number} counter : Counter used to distinguish same nonce 32 bits
@param {String} nonce   : Nonce in string format "xx:xx:xx" 96bits
@returns {Array} 		 : Keystream in serialized order. It's an array of hex formated 512 bits keystreams.
*/
function chacha20_block(chacha,key,counter,nonce)
{
	/*Constants as defined in IETF RFC 7539 */
	constant=[0x61707865, 0x3320646e,0x79622d32, 0x6b206574];
	key_matrix=unserialized(key);
	nonce_matrix=unserialized(nonce);
	matrix= new Array(16);
	for(var i=0;i<4;i++)
		matrix[i]=constant[i];
	for(var i=0;i<8;i++)
		matrix[i+4]=parseInt(key_matrix[i],16);
	matrix[12]=counter;
	for (var i = 0; i < 3; i++)
		matrix[i+13]=parseInt(nonce_matrix[i],16);
	/* JS creates shallow copies of the object or array by default(on state=matrix).So,here Deep copies are made*/
	state=new Array(16);
	for(var i=0 ;i <16 ; i++)
		state[i]=matrix[i];

	chacha.word=matrix;

    for(var i=0;i<10;i++)
    {
    	quater_round_state(chacha,0,4,8,12);
    	quater_round_state(chacha,1,5,9,13);
    	quater_round_state(chacha,2,6,10,14);
       	quater_round_state(chacha,3,7,11,15);
    	quater_round_state(chacha,0,5,10,15);
    	quater_round_state(chacha,1,6,11,12);
    	quater_round_state(chacha,2,7,8,13);
    	quater_round_state(chacha,3,4,9,14);
    }

    for (var i = 0; i < 16; i++) 
    {
		chacha.word[i]=((chacha.word[i] + state[i]) & 0xffffffff) >>> 0;
	}

    keystream=serialized(chacha.word);

    return keystream
}
/* To-do write more custom test cases */
function test_chacha20_block(chacha){
	Key = "00:01:02:03:04:05:06:07:08:09:0a:0b:0c:0d:0e:0f:10:11:12:13:14:15:16:17:18:19:1a:1b:1c:1d:1e:1f";
	nonce="00:00:00:09:00:00:00:4a:00:00:00:00";
	counter=1;
	console.log(chacha20_block(chacha,Key,counter,nonce));
}
/* ChaCha20 Encryption/Decryption Algorithm as described in RFC7539
@param {object} chacha     : chacha object used for passing reference
@param {String} key        : Key in string format "xx:xx:xx" 256 bits
@param {Number} counter    : Counter used to distinguish same nonce 32 bits
@param {String} nonce      : Nonce in string format "xx:xx:xx" 96 bits
@param	{String} plaintext : Plain text of arbitary length
returns {Array}	 		   : Array of Encrypted/Decrypted of the input plaintext
*/
function chacha20_encrypt_decrypt(chacha,key,counter,nonce,plaintext)
{
	len=Math.floor(plaintext.length/64);

	block=[];
	encrypted_message=[];
	for(var i=0; i<len;i++)
	{
		key_stream=chacha20_block(chacha,key,counter+i,nonce);
		for(var j=0;j<64;j++)
		{
			block[j]=plaintext[i*64+j].charCodeAt();
			encrypted_message[i*64+j]=block[j]^key_stream[j];
		}
	}

	if(((plaintext.length)%64) != 0 )
	{
		i=len;
		key_stream=chacha20_block(chacha,key,counter+i,nonce);
		for(var j=0;j<(plaintext.length)%64;j++)
		{
			block[j]=plaintext[i*64+j].charCodeAt();
			encrypted_message[i*64+j]=block[j]^key_stream[j];
		}
	}
	return encrypted_message;
}

function test_chacha20_encrypt_decrypt()
{
	key ="00:01:02:03:04:05:06:07:08:09:0a:0b:0c:0d:0e:0f:10:11:12:13:14:15:16:17:18:19:1a:1b:1c:1d:1e:1f"
	nonce="00:00:00:00:00:00:00:4a:00:00:00:00";
	counter=1;
	plaintext="Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it. \n -m2n";
	enc=chacha20_encrypt_decrypt(chacha,key,counter,nonce,plaintext);
	
	encrypted_message=[];
	for (var i = 0; i<enc.length; i++) {
		// console.log(enc[i].toString(16));
		encrypted_message[i]=String.fromCharCode(enc[i]);
	};
	e=encrypted_message.join("");
	console.log("\n Encrypted Message : \n "+ e);
	decrpyted=chacha20_encrypt_decrypt(chacha,key,counter,nonce,e);
	decrpyted_message=[];
	for(var i=0;i<decrpyted.length;i++)
	{
		decrpyted_message[i]=String.fromCharCode(decrpyted[i]);
	}
	d=decrpyted_message.join("");
	console.log("\n Decrypted Message : \n "+d);
}
/* For clamping the fix values of the r */
function clamp(r)
{
	 r[3] &= 15;
     r[7] &= 15;
     r[11] &= 15;
     r[15] &= 15;
     r[4] &= 252;
     r[8] &= 252;
     r[12] &= 252;
     return r;
}
/* Convert (key) --> (r,s) pair
@param {String}       : Key string of 256 bits
returns {Array,Array} : Returns the Array of (r,s) pair)
*/
function convertors(key)
{
	key_matrix=unserialized(key);
	//console.log(key_matrix);
	temp_s=[];
	temp_r=[];
	var k=0;
	for(var i=key_matrix.length-1;i>=key_matrix.length/2;i--)
	{
		temp_s[k]=key_matrix[i];
		k++;
	}
	k=0;
	for(var i=(key_matrix.length/2)-1;i>=0;i--)
	{
		temp_r[k]=key_matrix[i];
		k++;
	}
	s=[];
	r=[];
	for(var i=0;i<temp_s.length;i++)
	{
		s.push.apply(s,temp_s[i].match(/.{1,2}/g));
	}
		
	for(var i=0;i<s.length;i++)
		s[i]=parseInt(s[i],16);
	
	for(var i=0;i<temp_r.length;i++)
	{
		r.push.apply(r,temp_r[i].match(/.{1,2}/g));
	}
	r.reverse();
	//console.log(r);	
	for(var i=0;i<r.length;i++)
		r[i]=parseInt(r[i],16);
	r=clamp(r);
	r.reverse();
	return [r,s];
}
/* Poly1305 Algoritm 
@param {string} msg 		  : contains the plaintext
@param {string} key 		  : 256 bits one time key in octet forms "xx:xx:xx..."
returns {array of string} mac : 128 bits tag in the little endian form 
*/
function poly1305_mac(msg,key)
{
	rs=convertors(key);
	r=rs[0];
	s=rs[1];
	block=[];
	var big=require('./biginteger');

	for(i=0;i<16;i++)
	{	s[i]=s[i].toString(16);
		r[i]=r[i].toString(16);
		if(i!=0)
		{
			if(s[i].length<2)
				s[i]="0"+s[i];
			if(r[i].length<2)
				r[i]="0"+r[i];
		}
	}
	s=s.join("");
	r=r.join("");
	s=big.BigInteger.parse(s,16);
	r=big.BigInteger.parse(r,16);
	a=big.BigInteger();
	p=big.BigInteger.parse('3fffffffffffffffffffffffffffffffb',16);
	for(var i=0; i< Math.floor(msg.length/16);i++)
	{
		for (var j = 0; j < 16; j++) {
			block[j]=msg[i*16+j].charCodeAt();
			block[j]=block[j].toString(16);
			if(j!=0)
			{
				if(block[j].length<2)
					block[j]="0"+block[j];
			}
		};
		block.reverse();
		b=block.join("")
		b="01"+b;
		Block=big.BigInteger.parse(b,16);
		a=a.add(Block);
		a=a.multiply(r);
		a=a.remainder(p);
	}
	if((msg.length)%16!=0)
	{
		block=[];
		for (var j = 0; j < (msg.length)%16; j++) {
			block[j]=msg[i*16+j].charCodeAt();
			block[j]=block[j].toString(16);
			if(j!=0)
			{
				if(block[j].length<2)
					block[j]="0"+block[j];
			}
		};
		block.reverse();
		b=block.join("");
		b="01"+b;
		Block=big.BigInteger.parse(b,16);
		a=a.add(Block);
		a=a.multiply(r);
		a=a.remainder(p);
	}
	a=a.add(s);
	tag=a.toString(16);
	if(tag.length>32)
	{
		tag=tag.substring(tag.length-32);
		tag=tag.match(/.{1,2}/g);
		tag.reverse();
		return tag;
	}	
	else
	{
		tag=tag.match(/.{1,2}/g);
		tag.reverse();
		return tag;
	}
}
function test_poly1305_mac()
{
	key="85:d6:be:78:57:55:6d:33:7f:44:52:fe:42:d5:06:a8:01:03:80:8a:fb:0d:b2:fd:4a:bf:f6:af:41:49:f5:1b";
	msg="Cryptographic Forum Research Group";
	tag=poly1305_mac(msg,key);
	console.log(tag);
}	
/* Poly1305 key generator using ChaCha20 Block Functions
@param {string} key       : 256 bits key in hex octets form (xx:xx:xx)
@param {string} nonce     : 96 bits nonce in hex octets form (xx:xx:xx)
returns {string} poly_key : 256 bits one-time Poly1305 key in hex octets form (xx:xx:xx)
*/
function poly1305_key_gen(key,nonce)
{
	counter=0;
	block=chacha20_block(chacha,key,counter,nonce);
	poly_key=[];
	/* considered first 256 bits of the keystream generated by the chacha20_block function*/
	for(var i=0;i<32;i++)
	{
		poly_key[i]=block[i].toString(16);
		if(i!=0)
		{
			if(poly_key[i].length<2)
			{
				poly_key[i]="0"+poly_key[i];
			}
		}
	}
	poly_key=poly_key.join(":");
	//console.log(poly_key);
	return poly_key;
}
function test_poly1305_key()
{
	key="80:81:82:83:84:85:86:87:88:89:8a:8b:8c:8d:8e:8f:90:91:92:93:94:95:96:97:98:99:9a:9b:9c:9d:9e:9f";
	nonce="00:00:00:00:00:01:02:03:04:05:06:07";
	poly1305_key=poly1305_key_gen(key,nonce);
	console.log(poly1305_key);
}
test_poly1305_key();