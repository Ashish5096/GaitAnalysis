//Global Variables
const canvas =  document.getElementById("pose-canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("pose-video");
const pose = new Pose({locateFile: (file) => {
    return `assets/${file}`;
}});
const k =1;

var dflag=false, kflag=false,strideflag=false, setflag=false;
var initial_height_px=0, height_cm=1,start_point=0,cnfThreshold=0.10,results_cpy;
var lstep_flag=false,rstep_flag=true,n1=0, n2=0,nsteps=0,lr_step_threshold=0;

const config ={
    video:{ width: 480, height: 640, fps: 30}
    //video:{ width: 280, height: 440, fps: 30}
};

async function setParameters(button)
{
    // Initializing parameters like height, start point, lr_step_threshold

    height_cm = document.getElementById("height").value;
    
    if(setflag==false && height_cm>1)
    {
        let eyeL = results_cpy.poseLandmarks[2]
        let eyeR = results_cpy.poseLandmarks[5]
        let kneeR = results_cpy.poseLandmarks[26]
        let ankleL = results_cpy.poseLandmarks[27]
        let ankleR = results_cpy.poseLandmarks[28]
        let count =0;
        let timeFrame = 500
        let start = new Date().getTime();
        let end = start;

        while(end - start < timeFrame)
        {
            
            start_point = start_point+ (ankleL.y +ankleR.y)/2
            lr_step_threshold = lr_step_threshold + distance(ankleL.x, ankleL.y, ankleR.x, ankleR.y)
            initial_height_px = initial_height_px+ (distance(0, eyeL.y, 0, ankleL.y) + distance(0, eyeR.y, 0, ankleR.y))/2;
            count = count +1;
            button.innerHTML = "Initializing ...."

            end = new Date().getTime();
        }

        initial_height_px  = (initial_height_px / count).toFixed(2);
        start_point = (start_point / count).toFixed(2)
        lr_step_threshold = (lr_step_threshold/count) * (height_cm/initial_height_px).toFixed(2);

        button.innerHTML = "Done"
        setflag=true;
    }
}

function resetParameters(button)
{
    if(setflag==true)
    {
        height_cm=0;
        initial_height_px=0;
        start_point=0;
        lr_step_threshold=0;
        button.innerHTML = "Initialize Parameters";
        setflag=false;
    }  
}

function toggleDistance(button)
{
    // To Toggle distance button between detect and pause

    if (dflag)
    {
        dflag = false;
        button.innerHTML= "Start"; 
    } 
    else 
    {
        dflag = true;
        timer()
        button.innerHTML= "Stop";     
    }
}

function timer()
{
    // Timer Function, Starts when distance button is in detect mode
    // Gets cleared when distance button is in pause mode

    let sec=0,min=0;

    var time = setInterval(function(){
    	
        if (!dflag) {
            clearInterval(time);
        }
        
    	document.getElementById('time').innerHTML=min+":"+sec;
        sec++;

        if(sec == 60)
        {
            sec=0;
            min++;
        }
        
    }, 1000);
}

function toggleStrideLength(button){

// To toggle stride length button between Detect and pause
// Activates only when both right and left step length is in detect mode

    if (strideflag) {

        strideflag = false;
        button.innerHTML= "Detect"; 
    } 
    else {

            strideflag = true;
            button.innerHTML= "Pause"; 
    }
}

function distance(x1,y1,x2,y2){

    // calculate eucliedean distance between point(x1,y1) and (x2,y2)

    let a = x2-x1;
    let b = y2-y1;
    let result = Math.sqrt( a*a + b*b);

    return result;
}

async function main()
{
    // Main function
    // Initialize required variables, load model, etc.

    const setBttn = document.getElementById("bttn3");
    const resetBttn = document.getElementById("bttn4");
    const strideBttn = document.getElementById("bttn5");
    const distanceBttn = document.getElementById("bttn8");

    setBttn.onclick = function(){
        setParameters(setBttn)
    }

    resetBttn.onclick = function(){
        resetParameters(setBttn)
    }

    strideBttn.onclick = function(){
        toggleStrideLength(strideBttn)
    }

    distanceBttn.onclick = function(){
        toggleDistance(distanceBttn)
    }

    pose.setOptions({
        staticImageMode: false,
        upperBodyOnly: false,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);

    computeFrame();
}

function calculateAngle(x1,y1,x2,y2,x3,y3)
{
    // calculate angle between the lines
    // considering a line of slope 0 at point (x2,y2)
     
    let m1 = (y2-y1)/(x2-x1)    
    let m2 = 0
    let m3 = (y3-y2)/(x3-x2)    

    let a1 = Math.abs((m2-m1)/(1+ m1*m2))
    let a2 = Math.abs((m3-m2)/(1+ m3*m2))

    let angle_rad1 = Math.atan(a1)
    let angle_rad2 = Math.atan(a2)
        
    let angle1 = angle_rad1 *(180.0 / Math.PI)
    let angle2 = angle_rad2 *(180.0 / Math.PI)
    
    let angle = (angle1+ angle2).toFixed(2)

    return angle
}

function calculateFootAngle(x1,y1,x2,y2){
 
    let m1 = (y2-y1)/(x2-x1)    
    let m2 = 0

    let a1 = Math.abs((m2-m1)/(1+ m1*m2))
    let angle_rad = Math.atan(a1)
    let angle = angle_rad *(180.0 / Math.PI)

    return (90-angle).toFixed(2)
}

function calculateAnkleAngle(x1,y1,x2,y2,x3,y3){
    
    //  Formula:   a^2 + b^2 - 2abCos(C) = c^2

    let a_sq = ((x2-x1)*(x2-x1)) + ((y2-y1)*(y2-y1));
    let b_sq = ((x3-x2)*(x3-x2)) + ((y3-y2)*(y3-y2));
    let c_sq = ((x3-x1)*(x3-x1)) + ((y3-y1)*(y3-y1));

    let value= (a_sq + b_sq - c_sq)/(2* Math.sqrt(a_sq)* Math.sqrt(b_sq) )
    let angle_rad = Math.acos(value)
    let angle = angle_rad *(180.0 / Math.PI)

    return angle
}

function calculateHipAngle(x1,y1,x2,y2,x3,y3){
    //  Formula:   a^2 + b^2 - 2abCos(C) = c^2

    let a_sq = ((x2-x1)*(x2-x1)) + ((y2-y1)*(y2-y1));
    let b_sq = ((x3-x2)*(x3-x2)) + ((y3-y2)*(y3-y2));
    let c_sq = ((x3-x1)*(x3-x1)) + ((y3-y1)*(y3-y1));

    let value= (a_sq + b_sq - c_sq)/(2* Math.sqrt(a_sq)* Math.sqrt(b_sq) )
    let angle_rad = Math.acos(value)
    let angle = angle_rad *(180.0 / Math.PI)

    return angle
}

function sigmoid(x){
    return 1 / (1 + Math.exp(-x/k));
}

function onResults(results)
{
    // draw image frame,skeleton points
    // calculate right & left step length,stride length, joint angles and display it

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    fps_start_time = performance.now();
    //console.log(results)

    if(results.poseLandmarks)
    {

        results_cpy=results;
        //console.log(results.poseLandmarks)
        let eyeL = results.poseLandmarks[2]
        let eyeR = results.poseLandmarks[5]
        let shoulderL = results.poseLandmarks[11]
        let shoulderR = results.poseLandmarks[12]
        let hipL = results.poseLandmarks[23]
        let hipR = results.poseLandmarks[24]
        let kneeL = results.poseLandmarks[25]
        let kneeR = results.poseLandmarks[26]
        let ankleL = results.poseLandmarks[27]
        let ankleR = results.poseLandmarks[28]
        let heelL = results.poseLandmarks[29]
        let heelR = results.poseLandmarks[30]
        let foot_indexR = results.poseLandmarks[32];
        let foot_indexL = results.poseLandmarks[31];

        let current_height_px = (distance(0, eyeL.y, 0, ankleL.y) + distance(0, eyeR.y, 0, ankleR.y))/2 
        let px2cm_factor= height_cm/current_height_px;

        //Right & Left Foot Angle
        let rval = calculateFootAngle(heelR.x, heelR.y, foot_indexR.x, foot_indexR.y);
        let lval = calculateFootAngle(heelL.x, heelL.y, foot_indexL.x, foot_indexL.y)
        document.getElementById("fa-angle-R").innerHTML = rval; 
        document.getElementById("fa-angle-L").innerHTML = lval;
        
        //Right Knee Angle  & Left Knee Angle 
        let rk_val = (180-  calculateAngle(hipR.x, hipR.y, kneeR.x, kneeR.y, ankleR.x, ankleR.y)).toFixed(2)
        let lk_val = (180-  calculateAngle(hipL.x, hipL.y, kneeL.x, kneeL.y, ankleL.x, ankleL.y)).toFixed(2)
        document.getElementById("k-angle-R").innerHTML = rk_val;
        document.getElementById("k-angle-L").innerHTML = lk_val;

        // Right Ankle Angle &  Left Ankle Angle
        let ra_val = (calculateAnkleAngle(kneeR.x, kneeR.y, ankleR.x, ankleR.y,foot_indexR.x, foot_indexR.y)).toFixed(2);
        let la_val = (calculateAnkleAngle(kneeL.x, kneeL.y, ankleL.x, ankleL.y,foot_indexL.x, foot_indexL.y)).toFixed(2);
        document.getElementById("ank-angle-R").innerHTML = ra_val;
        document.getElementById("ank-angle-L").innerHTML = la_val;

        if(setflag)
        {
            // Knee Distance
            document.getElementById("knee-d").innerHTML= (px2cm_factor * distance(kneeL.x, kneeL.y, kneeR.x, kneeR.y)).toFixed(2);
        }

        // Hip Angle
        document.getElementById("hip-angle-R").innerHTML = (calculateHipAngle(shoulderR.x, shoulderR.y, hipR.x, hipR.y, kneeR.x, kneeR.y)).toFixed(2)
        document.getElementById("hip-angle-L").innerHTML = (calculateHipAngle(shoulderL.x, shoulderL.y, hipL.x, hipL.y, kneeL.x, kneeL.y)).toFixed(2)
        

        if(dflag && setflag)
        {
            let end_point = (ankleL.y+ankleR.y)/2
            let d = Math.abs(start_point - end_point)
            d = px2cm_factor * d
            document.getElementById("distance").innerHTML = d.toFixed(2)
        }

        if(strideflag && setflag)
        {
            let sign = (px2cm_factor*(ankleR.y - ankleL.y))
            //let sign = (ankleR.y - ankleL.y)/(current_height_px/initial_height_px)
            let step_d = (px2cm_factor * distance(ankleL.x, ankleL.y, ankleR.x, ankleR.y)) - lr_step_threshold
            let r = sigmoid(step_d);

            
            if(rstep_flag && sign>1 && r>=0.94)
            {
                nsteps++;
                rstep_flag = false
                lstep_flag = true;
                n1=step_d;
                document.getElementById("rs-d").innerHTML = step_d.toFixed(2);
                document.getElementById("ls-d").innerHTML = 0;
            }
            else if(lstep_flag && sign<1 && r>=0.94)
            {
                nsteps++;
                rstep_flag = true
                lstep_flag = false;
                n2=step_d;
                document.getElementById("rs-d").innerHTML = 0;
                document.getElementById("ls-d").innerHTML = step_d.toFixed(2);
            }
            
            if( n1 > 0 && n2 > 0 )
                document.getElementById("stride").innerHTML = (n1+n2).toFixed(2)
            else
                document.getElementById("stride").innerHTML = 0;
            
            document.getElementById("nsteps").innerHTML=nsteps;
        } 
    }

    time_diff = performance.now() - fps_start_time
            
    if(time_diff ==0)
        fps =0
    else
        fps = 1/ time_diff
                
    fps_text = "FPS:"+(fps).toFixed(2)
    ctx.font = "20px Comic Sans MS";
    ctx.fillStyle = "red";
    ctx.fillText(fps_text, 10, 40);
    
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS,{color: '#00FF00', lineWidth: 4});
    drawLandmarks(ctx, results.poseLandmarks,{color: '#FF0000', lineWidth: 1});
}


async function init_camera_canvas()
{
    const constraints ={
        audio: false,
        video:{
        width: config.video.width,
        height: config.video.height,
        facingMode: 'environment',
        frameRate: { max: config.video.fps }
        }
    };
    
    video.width = config.video.width;
    video.height = config.video.height;

    canvas.width =  video.width;
    canvas.height = video.height;
    console.log("Canvas initialized");

    navigator.mediaDevices.getUserMedia(constraints).then(async function(stream) {

        video.srcObject = stream;
        video.onloadedmetadata = function(e) {
            video.play();
        };
        main();
    });   
}

async function computeFrame()
{
    await pose.send({image: video});
    setTimeout(computeFrame, 1000 / 10);
}

document.addEventListener('DOMContentLoaded',function(){
    init_camera_canvas();
});
