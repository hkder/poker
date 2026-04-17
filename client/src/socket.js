import { io } from 'socket.io-client';
const socket = io({ withCredentials: true, autoConnect: false });
export default socket;
