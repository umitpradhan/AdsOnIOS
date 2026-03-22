import { _decorator, Component } from 'cc';
import { AdBridge } from './AdBridge';

const { ccclass } = _decorator;

/**
 * Approot — Root script attached to the scene root node.
 *
 * Bootstraps the AdBridge native listener on load so it is ready
 * before any UI scripts start making ad calls.
 */
@ccclass('Approot')
export class Approot extends Component {

    onLoad(): void {
        // Initialize the native bridge listener once, before anything else.
        AdBridge.getInstance().init();
        console.log('[Approot] AdBridge initialised');
    }
}
