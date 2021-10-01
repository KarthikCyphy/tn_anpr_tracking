import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class LoaderService {

    isLoading = new BehaviorSubject(true);
    showLoadingText = new BehaviorSubject<string>('');
    getLoadingText = this.showLoadingText.asObservable();

    constructor() { }

    show() {
        this.isLoading.next(true);
    }

    hide() {
        this.isLoading.next(false);
    }

    sendLoadingText(message: string) {
        this.showLoadingText.next(message);
    }

}
