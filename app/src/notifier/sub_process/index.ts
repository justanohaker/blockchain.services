import { NotifyProvider } from './notify.provider';

async function main() {
    const notifyProvider = new NotifyProvider();

    process.on('message', (message: any, sendHandle: any) => {
        console.log('sub process message:', JSON.stringify(message));
        notifyProvider.addMessage(message);
    });

    process.on('exit', (code: number) => {
        console.log('sub process exit');
    });

    process.on('uncaughtException', (error: Error) => {
        console.log('sub process uncaughtException:', error);
    });

    process.on('unhandledRejection', (reason: Object, promise: Promise<any>) => {
        console.log('sub process unhandledRejection:', reason);
    });

    process.on('rejectionHandled', (promise: Promise<any>) => {
        console.log('sub process rejectionHandled');
    });
}

main();

