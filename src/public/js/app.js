const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;

let roomName;

function addMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

function handleMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  const value = input.value;
  socket.emit("new_message", input.value, roomName, () => {
    addMessage(`You: ${value}`);
  });
  input.value = "";
}

function handleNickNameSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#nick input");
    const value = input.value;
    socket.emit("nickname", input.value, roomName);
    input.value = "";
}

function enterRoom(count) {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `채팅방 ${roomName} (${count})`;
  const msgForm = room.querySelector("#msg");
  const nickForm = room.querySelector("#nick");
  msgForm.addEventListener("submit", handleMessageSubmit);
  nickForm.addEventListener("submit", handleNickNameSubmit);
}

function handleRoomSubmit(event) {
  event.preventDefault();
  const input = form.querySelector("input");
  socket.emit("enter_room", input.value, enterRoom);
  roomName = input.value;
  input.value = "";
}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user, newCount) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `채팅방 ${roomName} (${newCount})`;
  addMessage(`${user}님이 입장하셨습니다!`);
});

socket.on("bye", (left, newCount) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  addMessage(`${left}님이 방을 나갔습니다.`);
});

socket.on("new_message", addMessage);

socket.on("room_change",(roomlist)=>{
    const roomUl = welcome.querySelector("ul");
    roomUl.innerHTML="";
    roomlist.forEach(room => {
        const roomli=document.createElement("li");
        roomli.innerText=room;
        roomUl.append(roomli);
    });
});