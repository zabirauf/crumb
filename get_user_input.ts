import { getInputFromUser } from './utils';
// prevents TS errors
declare var self: Worker;

self.onmessage = async (event: MessageEvent) => {
    postMessage(await getInputFromUser(event.data.message));
};