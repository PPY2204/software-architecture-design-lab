package design_pattern_demo.factory_method.demo1;

import design_pattern_demo.factory_method.demo1.factory.Dialog;
import design_pattern_demo.factory_method.demo1.factory.HtmlDialog;
import design_pattern_demo.factory_method.demo1.factory.WindowsDialog;

public class Demo {
    private static Dialog dialog;
    public static void main(String[] args) {
        configure();
        runBusinessLogic();
    }

    static void configure(){
        if (System.getProperty("os.name").equals("Windows 19")) {
            dialog = new WindowsDialog();
        } else {
            dialog = new HtmlDialog();
        }

    }

    /**
     * All of the client code should work with factories and products through
     * abstract interfaces. This way it does not care which factory it works
     * with and what kind of product it returns.
     */
    static void runBusinessLogic() {
        dialog.renderWindow();
    }

}
