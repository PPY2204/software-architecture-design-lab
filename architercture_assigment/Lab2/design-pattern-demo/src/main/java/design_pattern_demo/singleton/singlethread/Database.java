package design_pattern_demo.singleton.singlethread;

public final class Database {
    private static Database instance;
    public String value;

    private Database(String value) {
        // The following code emulates slow initialization.
        try {
            Thread.sleep(1000);
        } catch (InterruptedException ex) {
            ex.printStackTrace();
        }
        this.value = value;
    }

    public static Database getInstance(String value) {
        if (instance == null) {
            instance = new Database(value);
        }
        return instance;
    }
}
