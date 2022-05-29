import {execSync} from 'child_process';

export class ShellService {
    private static instance: ShellService | null;

    private constructor() {
    }

    public static getInstance(): ShellService {
        if (!this.instance) {
            this.instance = new ShellService();
        }

        return this.instance;
    }

    public showPIDs(): string[] {
        const rawResult = execSync('ps aux | grep node | grep \'/.nvm/\' | awk \'{print $2}\'');

        return rawResult.toString().split('\n').filter((item) => {
            return item;
        });
    }

    public showCPUUsageForPID(pid: string): number {
        const rawResult = execSync(`ps ax -o %cpu,pid|sort -n|grep ${pid}`);

        return Number(rawResult.toString().trim().split(' ')[0]);
    }

    public killProcess(pid: string): void {
        execSync(`kill ${pid} -9`);
    }
}
