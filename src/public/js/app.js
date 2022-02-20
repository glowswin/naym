const socket = io();
//welcome form
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
//room form
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");
const chattul = document.querySelector("#chattt ul");
const chattInput = document.querySelector("#chattt input");
const chattbtn = document.querySelector("#chattt button");
//welcome 버튼
welcomeForm.addEventListener("submit", handleWelcomeSubmit);
//소리버튼
muteBtn.addEventListener("click", handleMuteClick);
//카메라버튼
cameraBtn.addEventListener("click", handleCameraClick);
//카메라변경박스
camerasSelect.addEventListener("input", handleCameraChange);
//채팅보내기버튼
chattbtn.addEventListener("click", sendChatBtn);

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;
//채팅보내기버튼
function sendChatBtn(event) {
  const val = chattInput.value;
  if (val == "") return;
  myDataChannel.send(val);
  const li = document.createElement("li");
  li.innerText = `나: ${val}`;
  chattul.append(li);
  chattInput.value = "";
}
//채팅수신
function receiveData(data) {
  const li = document.createElement("li");
  li.innerText = `상대방: ${data}`;
  chattul.append(li);
}

//welcome버튼 실행함수
async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = "";
}
//방입장 초기함수-카메라실행,카메라연결시작
async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}
//본인카메라 가져오기 - 선택된 카메라가 있을 경우 그 카메라 가져오기
async function getMedia(deviceId) {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}
//카메라 리스트 가져오기- 기존에 선택된 카메라가 있을 경우 그 카메라가 선택된 상태로
async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

//소리 켜도 끄기
function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "소리켜기";
    muted = true;
  } else {
    muteBtn.innerText = "소리끄기";
    muted = false;
  }
}
//카메라 켜고 끄기
function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "카메라 끄기";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "카메라 켜기";
    cameraOff = true;
  }
}
//본인카메라교체 - 송출카메라 정보도 교환한다.
async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  //연결된 송신카메라가 있을경우 바꿈.
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

//서튼서버 상대연결
function makeConnection() {
  //서튼서버
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  //ice랑 stream추가 이벤트
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  //mystream peerconnection에 연결
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}
//answer후  icecandidate를 서로상대방에게 보냄
function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}
//icecandidate 송수신후 상대방의 스트림을 화면에 연결한다.
function handleAddStream(data) {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
}

//소켓 수신대기 함수들
//A-offer송신-누군가 방참여시 최초개설자에게 발생
socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => receiveData(event.data));
  console.log("made data channel");
  //참여자에게 offer생성해서 보냄
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});
//B-offer수신후 answer송신
socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) =>
      receiveData(event.data)
    );
  });
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});
//A- answer수신
socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});
//서로에게 보내어진 icecandidate를 저장한다.
socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});
