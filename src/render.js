// Imagine this as the Front-End code and has
// access to everything you would expect in the browser
const videoElement = document.querySelector("video");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const videoSelectBtn = document.getElementById("videoSelectBtn");

// Onclick Functions
videoSelectBtn.onclick = getVideoSources;

startBtn.onclick = e => {
    mediaRecorder.start();
    startBtn.classList.add("is-danger");
    startBtn.innerText = "Recording";
};

stopBtn.onclick = e => {
    mediaRecorder.stop();
    startBtn.classList.remove("is-danger");
    startBtn.innerText = "Start";
};


// Import NodeJs Modules in the Browser
// Electron has a Menu class available only in the main Process but we access it using remote
// remote is for interprocess communication IPC
const {desktopCapturer, remote} = require("electron");

// Import dialog & Menu from remote
const {dialog, Menu} = remote;

//MediaRecorder instance to capture video
let mediaRecorder;
const recordedChunks = [];


// Required to write the file to the system
const {writeFile} = require("fs");


// Get all available video sources
async function getVideoSources()
{
    // This method returns a promise so we use await keyword to await the actual value
    // Value is ana array of objects which is equal to the screens
    const inputSources = await desktopCapturer.getSources({
        types: ["window", "screen"]
    });
    // This methods expects an array of objects where each object represents a different menu item
    const videoOptionsMenu = Menu.buildFromTemplate(
        // Convert array of input sources to array of MenuItems
        inputSources.map(source => {
            return {
                label: source.name,
                // Register an event handler for click
                click: () => selectSource(source)
            };
        })
    );
    videoOptionsMenu.popup();
}

async function selectSource(source) {
    videoSelectBtn.innerText = source.name;

    // To capture video from the source
    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: source.id
            }
        }
    };
    // Create a stream
    // This will provide a stream of video of whatever is happening in that window
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    videoElement.play();

    // Create the media recorder
    const options = {mimeType: "video/webm; codecs=vp9"};
    mediaRecorder = new MediaRecorder(stream, options);

    //Recorder can be controlled by user and has event based API
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
}

function handleDataAvailable(e) {
    console.log("Video data available.");
    recordedChunks.push(e.data);
}

async function handleStop(e) {
    // To convert chunks into video file
    // Blob is data structure to handle raw data
    const blob = new Blob(recordedChunks, {
        type: "video/webm; codecs: vp9"
    });

    // Create buffer which is also object to handle raw data
    const buffer = Buffer.from(await blob.arrayBuffer());

    const {filePath} = await dialog.showSaveDialog({
        buttonLabel: "Save video",
        defaultPath: `vid-${Date.now()}.webm`
    });
    console.log(filePath);
    // Callback based API
    if (filePath) {
        writeFile(filePath, buffer, () => console.log("video saved succesfully"));
    }

}

