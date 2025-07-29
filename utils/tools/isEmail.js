//Email validation
const isEmail =(email)=>{
	
	var emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
    if( !emailReg.test(email) || (email=="") )
		return false;
	else
		return true;            
}

module.exports = isEmail;