package design_pattern_demo.factory_method.demo1.factory;

import design_pattern_demo.factory_method.demo1.buttons.Button;
import design_pattern_demo.factory_method.demo1.buttons.HtmlButton;

public class HtmlDialog extends Dialog {

    @Override
    public Button createButton() {
        return new HtmlButton();
    }
}
