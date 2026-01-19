package design_pattern_demo.factory_method.demo1.factory;

import design_pattern_demo.factory_method.demo1.buttons.Button;
import design_pattern_demo.factory_method.demo1.buttons.WindowsButton;

/**
 * Windows Dialog will produce Windows buttons.
 */
public class WindowsDialog extends Dialog {

    @Override
    public Button createButton() {
        return new WindowsButton();
    }
}

